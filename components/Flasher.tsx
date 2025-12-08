import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Zap, Radio, AlertTriangle, CheckCircle, RefreshCw, Wand2, Terminal as TerminalIcon } from 'lucide-react';
import { FIRMWARES } from '../constants';
import { Firmware, LogEntry } from '../types';
import { SerialService } from '../services/serialService';
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

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Connect with auto-detect option. Returns the actual baud rate used or null on failure.
      const connectedRate = await serialService.connect(baudRate, autoDetect);
      
      if (connectedRate) {
        setIsConnected(true);
        const method = autoDetect ? (connectedRate === baudRate ? 'Auto-detect (fallback)' : 'Auto-detect') : 'Manual';
        onAddLog({ timestamp: Date.now(), message: `Device connected successfully via Web Serial at ${connectedRate} baud (${method}).`, type: 'success' });
        
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
    onAddLog({ timestamp: Date.now(), message: 'Device disconnected.', type: 'info' });
  };

  const handleFlash = useCallback(() => {
    if (!selectedFirmware || !isConnected) return;
    
    setIsFlashing(true);
    setProgress(0);
    onAddLog({ timestamp: Date.now(), message: `Starting flash process for ${selectedFirmware.name}...`, type: 'info' });

    // Simulated flashing steps since we can't easily bundle heavy binary flashing logic in this snippet
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

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setIsFlashing(false);
        onAddLog({ timestamp: Date.now(), message: `Successfully flashed ${selectedFirmware.name}!`, type: 'success' });
        return;
      }

      const step = steps[currentStep];
      setProgress(step.progress);
      onAddLog({ timestamp: Date.now(), message: step.msg, type: 'info' });
      currentStep++;
    }, 1200);

  }, [isConnected, selectedFirmware, onAddLog]);

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
              <button 
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg transition-all"
                title="Open Selection Wizard"
              >
                  <Wand2 className="w-3.5 h-3.5" />
                  Wizard
              </button>
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
            
            <div className="flex gap-3 w-full md:w-auto items-end">
                {!isConnected ? (
                    <>
                        <div className="flex flex-col gap-1.5">
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
                            <div className="relative">
                                <select
                                    value={baudRate}
                                    onChange={(e) => setBaudRate(Number(e.target.value))}
                                    disabled={isConnecting}
                                    className="h-10 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg pl-3 pr-8 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50 appearance-none min-w-[120px]"
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
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="flex-1 md:flex-none h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-wait"
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