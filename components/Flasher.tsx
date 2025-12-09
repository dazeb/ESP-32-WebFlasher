import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cpu, Zap, Radio, AlertTriangle, CheckCircle, RefreshCw, Wand2, Terminal as TerminalIcon, Upload } from 'lucide-react';
// @ts-ignore
import { ESPLoader, Transport } from 'esptool-js';
import { FIRMWARES } from '../constants';
import { Firmware, LogEntry } from '../types';
import { SerialService, SerialPort } from '../services/serialService';
import { Terminal } from './Terminal';
import { Wizard } from './Wizard';

interface FlasherProps {
  onAddLog: (log: LogEntry) => void;
  logs: LogEntry[];
}

const BAUD_RATES = [9600, 115200, 230400, 460800, 921600];

export const Flasher: React.FC<FlasherProps> = ({ onAddLog, logs }) => {
  const [selectedFirmware, setSelectedFirmware] = useState<Firmware | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [baudRate, setBaudRate] = useState(115200);
  const [autoDetect, setAutoDetect] = useState(true);
  const [serialService] = useState(() => new SerialService());
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Port management
  const [availablePorts, setAvailablePorts] = useState<SerialPort[]>([]);
  const [selectedPortIndex, setSelectedPortIndex] = useState<number>(-1); // -1 means "Request New"
  // Track the actual port object we are connected to
  const [currentPort, setCurrentPort] = useState<SerialPort | null>(null);

  useEffect(() => {
    const updatePorts = async () => {
      const ports = await serialService.getPorts();
      setAvailablePorts(ports);
    };

    updatePorts();

    // Listen for connection events if supported by browser
    if ('serial' in navigator) {
      navigator.serial.addEventListener('connect', updatePorts);
      navigator.serial.addEventListener('disconnect', updatePorts);
    }

    return () => {
      if ('serial' in navigator) {
        navigator.serial.removeEventListener('connect', updatePorts);
        navigator.serial.removeEventListener('disconnect', updatePorts);
      }
    };
  }, [serialService]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const portToUse = selectedPortIndex >= 0 ? availablePorts[selectedPortIndex] : undefined;
      
      // Connect with auto-detect option. Returns the actual baud rate used or null on failure.
      const connectedRate = await serialService.connect(baudRate, autoDetect, portToUse);
      
      if (connectedRate) {
        setIsConnected(true);
        setCurrentPort(serialService.getPort());
        const method = autoDetect ? (connectedRate === baudRate ? 'Auto-detect (fallback)' : 'Auto-detect') : 'Manual';
        onAddLog({ timestamp: Date.now(), message: `Device connected successfully via Web Serial at ${connectedRate} baud (${method}).`, type: 'success' });
        
        // Refresh ports list after a successful connection (especially if it was a new request)
        const ports = await serialService.getPorts();
        setAvailablePorts(ports);

        // Start reading generic serial data
        serialService.startReading((data) => {
          onAddLog({ timestamp: Date.now(), message: data.trim(), type: 'serial' });
        });
      } else {
        onAddLog({ timestamp: Date.now(), message: 'Failed to connect. Check permissions or cable.', type: 'error' });
      }
    } catch (e) {
        onAddLog({ timestamp: Date.now(), message: 'Connection error occurred.', type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await serialService.disconnect();
    setIsConnected(false);
    setCurrentPort(null);
    onAddLog({ timestamp: Date.now(), message: 'Device disconnected.', type: 'info' });
  };

  const handleFlash = useCallback(async () => {
    if (!selectedFirmware || !isConnected || !currentPort) return;
    
    setIsFlashing(true);
    setProgress(0);

    // If we have a file, use REAL flashing with esptool-js
    if (selectedFirmware.file) {
      await performRealFlash(selectedFirmware.file);
    } else {
      // Fallback to simulation for demo firmwares
      await performSimulatedFlash();
    }
    
    setIsFlashing(false);
  }, [isConnected, selectedFirmware, currentPort, onAddLog]);

  const performRealFlash = async (file: File) => {
    if (!currentPort) return;
    onAddLog({ timestamp: Date.now(), message: `Initializing esptool-js for ${file.name}...`, type: 'info' });

    try {
      // 1. Disconnect the monitoring service to free up the port for esptool
      await serialService.disconnect(true); // true = keep internal port ref if needed, but we rely on currentPort state
      
      // 2. Read file data
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      // 3. Initialize esptool
      const transport = new Transport(currentPort);
      const terminalAdapter = {
        clean: () => {},
        writeLine: (line: string) => onAddLog({ timestamp: Date.now(), message: `[ESP] ${line}`, type: 'serial' }),
        write: (line: string) => onAddLog({ timestamp: Date.now(), message: `[ESP] ${line}`, type: 'serial' }),
      };

      // Create Loader
      const loader = new ESPLoader(transport, baudRate, terminalAdapter);

      onAddLog({ timestamp: Date.now(), message: `Connecting to ROM bootloader...`, type: 'info' });
      const chip = await loader.main_fn();
      onAddLog({ timestamp: Date.now(), message: `Connected to ${chip}`, type: 'success' });

      // Calculate progress (esptool doesn't emit granular events easily via this API wrapper, so we might estimate or just log)
      // The ESPLoader usually logs percentage to the terminal, which we capture in terminalAdapter

      onAddLog({ timestamp: Date.now(), message: `Flashing binary to 0x10000...`, type: 'info' });
      
      // Flash the binary
      // Note: simple flash to 0x10000 (app offset) or 0x0 depending on bin type. 
      // For this generic tool, we'll try 0x0 which is common for full images, or let user decide?
      // Defaults to 0x0 is safest for "full backup" style dumps, 0x10000 for app updates.
      // We will assume 0x0 for custom bins for now to be safe with full dumps.
      const flashOptions = {
        fileArray: [{ data: fileData, address: 0x0 }],
        flashSize: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const percent = Math.round((written / total) * 100);
          setProgress(percent);
        },
      };

      await loader.write_flash(flashOptions);

      onAddLog({ timestamp: Date.now(), message: `Resetting device...`, type: 'info' });
      await transport.setDTR(false); // Reset
      await transport.setRTS(true);
      await new Promise(r => setTimeout(r, 100));
      await transport.setRTS(false); // Release reset

      onAddLog({ timestamp: Date.now(), message: `Flashing complete!`, type: 'success' });

    } catch (e: any) {
      console.error(e);
      onAddLog({ timestamp: Date.now(), message: `Flashing failed: ${e.message}`, type: 'error' });
    } finally {
      // Reconnect the monitor service
      onAddLog({ timestamp: Date.now(), message: `Reconnecting serial monitor...`, type: 'info' });
      // We use 'true' for autodetect logic reuse or just specific baud
      await serialService.connect(baudRate, false, currentPort);
      serialService.startReading((data) => {
        onAddLog({ timestamp: Date.now(), message: data.trim(), type: 'serial' });
      });
    }
  };

  const performSimulatedFlash = async () => {
      onAddLog({ timestamp: Date.now(), message: `Starting simulation for ${selectedFirmware?.name}...`, type: 'info' });
      onAddLog({ timestamp: Date.now(), message: `(Note: Pre-defined firmwares are simulated. Upload a .bin to test real flashing)`, type: 'warning' });

      const steps = [
        { msg: 'Erasing flash memory...', progress: 10, time: 1000 },
        { msg: 'Writing partition table...', progress: 20, time: 2000 },
        { msg: 'Writing bootloader...', progress: 30, time: 3000 },
        { msg: 'Writing application binary (0x10000)...', progress: 45, time: 4000 },
        { msg: 'Writing application binary (0x20000)...', progress: 60, time: 5500 },
        { msg: 'Writing application binary (0x30000)...', progress: 75, time: 7000 },
        { msg: 'Verifying hash...', progress: 90, time: 8500 },
        { msg: 'Resetting device...', progress: 100, time: 9500 },
      ];
  
      for (const step of steps) {
        if (!isConnected && !currentPort) break; // Abort if disconnected
        setProgress(step.progress);
        onAddLog({ timestamp: Date.now(), message: step.msg, type: 'info' });
        await new Promise(r => setTimeout(r, 1200));
      }
      
      onAddLog({ timestamp: Date.now(), message: `Successfully flashed ${selectedFirmware?.name}!`, type: 'success' });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const customFw: Firmware = {
      id: `custom-${Date.now()}`,
      name: file.name,
      description: `Custom binary upload (${(file.size / 1024).toFixed(2)} KB)`,
      version: 'Local',
      author: 'User',
      tags: ['Custom', 'Binary'],
      compatibility: ['ESP32', 'ESP32-S3', 'ESP32-C3', 'Flipper Zero'],
      file: file // Store the file object
    };

    setSelectedFirmware(customFw);
    onAddLog({ timestamp: Date.now(), message: `Loaded custom firmware file: ${file.name}`, type: 'success' });
    
    // Reset input to allow re-selecting the same file if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full relative">
      <Wizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        onSelect={(fw) => {
            setSelectedFirmware(fw);
            onAddLog({ timestamp: Date.now(), message: `Selected ${fw.name} via Wizard.`, type: 'info' });
        }}
      />

      {/* Firmware Selection Column */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                Select Firmware
              </h2>
              <div className="flex gap-2">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".bin"
                    onChange={handleFileUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isFlashing}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1.5 rounded-lg transition-all disabled:opacity-50"
                    title="Upload .bin file"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                </button>
                <button 
                    onClick={() => setIsWizardOpen(true)}
                    disabled={isFlashing}
                    className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg transition-all disabled:opacity-50"
                    title="Open Selection Wizard"
                >
                    <Wand2 className="w-3.5 h-3.5" />
                    Wizard
                </button>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {FIRMWARES.map((fw) => (
              <button
                key={fw.id}
                onClick={() => !isFlashing && setSelectedFirmware(fw)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group relative overflow-hidden ${
                  selectedFirmware?.id === fw.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                } ${isFlashing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isFlashing}
              >
                <div className="flex justify-between items-start mb-1">
                    <span className={`font-medium ${selectedFirmware?.id === fw.id ? 'text-emerald-300' : 'text-slate-200'}`}>{fw.name}</span>
                    <span className="text-xs text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">{fw.version}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{fw.description}</p>
                <div className="flex flex-wrap gap-1.5">
                    {fw.compatibility.map(chip => (
                        <span key={chip} className="text-[10px] uppercase font-bold tracking-wider text-slate-500 border border-slate-700 px-1 rounded bg-slate-900/30">
                            {chip}
                        </span>
                    ))}
                    {fw.tags.map(tag => (
                        <span key={tag} className="text-[10px] text-emerald-400/70 px-1">{tag}</span>
                    ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Flashing Controls & Terminal */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Connection & Actions Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Cpu className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-white font-medium">Device Status</h3>
                    <p className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isConnected ? 'Connected (Web Serial)' : 'Disconnected'}
                    </p>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-end">
                {!isConnected ? (
                    <>
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                            <label className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={autoDetect}
                                    onChange={(e) => setAutoDetect(e.target.checked)}
                                    disabled={isConnecting}
                                    className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 w-3.5 h-3.5"
                                />
                                Auto-Detect
                            </label>
                            
                            <div className="flex gap-2">
                              {/* Port Selector */}
                              <div className="relative flex-1 sm:w-40">
                                <select
                                    value={selectedPortIndex}
                                    onChange={(e) => setSelectedPortIndex(Number(e.target.value))}
                                    disabled={isConnecting}
                                    className="w-full h-10 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg pl-3 pr-8 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50 appearance-none truncate"
                                    title="Select Serial Port"
                                >
                                    <option value={-1}>Request New Device...</option>
                                    {availablePorts.map((port, index) => {
                                      const info = port.getInfo();
                                      const vid = info.usbVendorId ? info.usbVendorId.toString(16).padStart(4, '0') : '????';
                                      const pid = info.usbProductId ? info.usbProductId.toString(16).padStart(4, '0') : '????';
                                      return (
                                        <option key={index} value={index}>
                                          Device {index + 1} (VID:{vid})
                                        </option>
                                      );
                                    })}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                              </div>

                              {/* Baud Rate Selector */}
                              <div className="relative w-28">
                                  <select
                                      value={baudRate}
                                      onChange={(e) => setBaudRate(Number(e.target.value))}
                                      disabled={isConnecting}
                                      className="w-full h-10 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg pl-3 pr-8 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50 appearance-none"
                                      title="Target/Fallback Baud Rate"
                                  >
                                      {BAUD_RATES.map(rate => (
                                          <option key={rate} value={rate}>{rate}</option>
                                      ))}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                  </div>
                              </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="flex-1 md:flex-none h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-wait mt-auto"
                        >
                            {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Connect
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleDisconnect}
                        disabled={isFlashing}
                        className="flex-1 md:flex-none h-10 flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-6 rounded-lg font-medium transition-all"
                    >
                        Disconnect
                    </button>
                )}
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-sm text-slate-400">Target Firmware</p>
                    <p className="text-lg text-white font-medium">
                        {selectedFirmware ? selectedFirmware.name : <span className="text-slate-600 italic">No firmware selected</span>}
                    </p>
                </div>
                <button
                    onClick={handleFlash}
                    disabled={!isConnected || !selectedFirmware || isFlashing}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-3 rounded-lg font-bold tracking-wide transition-all shadow-lg shadow-blue-900/20"
                >
                    {isFlashing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {isFlashing ? 'FLASHING...' : 'FLASH FIRMWARE'}
                </button>
             </div>
             
             {/* Progress Bar */}
             <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
             </div>
             <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>0%</span>
                <span>{progress}%</span>
                <span>100%</span>
             </div>
          </div>
        </div>

        {/* Terminal */}
        <div className="flex-1">
            <Terminal logs={logs} />
        </div>
      </div>
    </div>
  );
};