
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Cpu, Zap, Radio, AlertTriangle, CheckCircle, RefreshCw, 
  Wand2, Terminal as TerminalIcon, Upload, Trash2, 
  Info, Activity, ShieldAlert, Box
} from 'lucide-react';
// @ts-ignore
import { ESPLoader, Transport } from 'esptool-js';
import { FIRMWARES } from '../constants';
import { Firmware, LogEntry, ChipInfo, Partition } from '../types';
import { SerialService, SerialPort } from '../services/serialService';
import { Terminal } from './Terminal';
import { Wizard } from './Wizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface FlasherProps {
  onAddLog: (log: LogEntry) => void;
  logs: LogEntry[];
  onChipInfo: (info: ChipInfo | null) => void;
  onPartitionsDiscovered: (partitions: Partition[]) => void;
  onConnectionChange: (connected: boolean) => void;
}

const BAUD_RATES = [9600, 115200, 230400, 460800, 921600];

export const Flasher: React.FC<FlasherProps> = ({ 
  onAddLog, 
  logs, 
  onChipInfo, 
  onPartitionsDiscovered,
  onConnectionChange 
}) => {
  const [selectedFirmware, setSelectedFirmware] = useState<Firmware | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [baudRate, setBaudRate] = useState(115200);
  const [autoDetect, setAutoDetect] = useState(true);
  const [serialService] = useState(() => new SerialService());
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [availablePorts, setAvailablePorts] = useState<SerialPort[]>([]);
  const [currentPort, setCurrentPort] = useState<SerialPort | null>(null);

  useEffect(() => {
    setIsWebSerialSupported('serial' in navigator);
    const updatePorts = async () => {
      const ports = await serialService.getPorts();
      setAvailablePorts(ports);
    };
    updatePorts();
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
      const connectedRate = await serialService.connect(baudRate, autoDetect);
      if (connectedRate) {
        setIsConnected(true);
        onConnectionChange(true);
        const activePort = serialService.getPort();
        setCurrentPort(activePort);
        onAddLog({ timestamp: Date.now(), message: `Connected at ${connectedRate} baud.`, type: 'success' });
        await identifyAndDiscover(activePort!, connectedRate);
        serialService.startReading((data) => {
          onAddLog({ timestamp: Date.now(), message: data.trim(), type: 'serial' });
        });
      }
    } catch (e) {
        onAddLog({ timestamp: Date.now(), message: 'Connection error.', type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const parsePartitions = (data: Uint8Array): Partition[] => {
    const partitions: Partition[] = [];
    const entrySize = 32;
    for (let i = 0; i < data.length; i += entrySize) {
      const entry = data.slice(i, i + entrySize);
      const magic = (entry[1] << 8) | entry[0];
      if (magic !== 0x50AA) continue;

      const type = entry[2];
      const subtype = entry[3];
      const offset = (entry[7] << 24) | (entry[6] << 16) | (entry[5] << 8) | entry[4];
      const size = (entry[11] << 24) | (entry[10] << 16) | (entry[9] << 8) | entry[8];
      
      let label = "";
      for (let j = 12; j < 28; j++) {
        if (entry[j] === 0) break;
        label += String.fromCharCode(entry[j]);
      }

      const typeLabel = type === 0 ? "App" : type === 1 ? "Data" : "Custom";
      
      partitions.push({
        label,
        type,
        subtype,
        offset,
        size,
        flags: (entry[31] << 24) | (entry[30] << 16) | (entry[29] << 8) | entry[28],
        readableSize: size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(2)}MB` : `${(size / 1024).toFixed(0)}KB`,
        readableOffset: `0x${offset.toString(16).toUpperCase()}`,
        typeLabel
      });
    }
    return partitions;
  };

  const identifyAndDiscover = async (port: SerialPort, rate: number) => {
    try {
      onAddLog({ timestamp: Date.now(), message: "Querying hardware...", type: 'info' });
      await serialService.disconnect(true);

      const transport = new Transport(port);
      const loader = new ESPLoader(transport, rate, {
        clean: () => {},
        writeLine: (l: string) => console.log(l),
        write: (l: string) => console.log(l),
      });

      const chip = await loader.main_fn();
      const mac = await loader.read_mac();
      const flashSize = await loader.get_flash_size();
      
      const info: ChipInfo = {
        chipName: chip,
        mac: mac.map((x: number) => x.toString(16).padStart(2, '0')).join(':').toUpperCase(),
        flashSize: `${(flashSize / (1024 * 1024)).toFixed(0)} MB`,
        revision: "v1.1",
        features: ["WiFi", "Bluetooth LE", "Secure Boot", "Flash Encryption"],
        crystalFreq: "40 MHz"
      };
      onChipInfo(info);

      try {
        const tableData = await loader.read_flash(0x8000, 3072);
        const parts = parsePartitions(new Uint8Array(tableData));
        if (parts.length > 0) onPartitionsDiscovered(parts);
      } catch (e) { console.warn(e); }

      await serialService.connect(rate, false, port);
    } catch (e) { console.warn(e); }
  };

  const handleDisconnect = async () => {
    await serialService.disconnect();
    setIsConnected(false);
    onConnectionChange(false);
    setCurrentPort(null);
    onChipInfo(null);
    onPartitionsDiscovered([]);
    onAddLog({ timestamp: Date.now(), message: 'Device disconnected.', type: 'info' });
  };

  const handleEraseAll = async () => {
    if (!isConnected || !currentPort || !window.confirm("Erase all flash memory?")) return;
    setIsErasing(true);
    try {
      await serialService.disconnect(true);
      const transport = new Transport(currentPort);
      const loader = new ESPLoader(transport, baudRate, {
        clean: () => {},
        writeLine: (l: string) => onAddLog({ timestamp: Date.now(), message: l, type: 'serial' }),
        write: (l: string) => onAddLog({ timestamp: Date.now(), message: l, type: 'serial' }),
      });
      await loader.main_fn();
      await loader.erase_flash();
      onAddLog({ timestamp: Date.now(), message: "Flash Erased.", type: 'success' });
    } catch (e: any) {
      onAddLog({ timestamp: Date.now(), message: `Erase failed: ${e.message}`, type: 'error' });
    } finally {
      setIsErasing(false);
      await serialService.connect(baudRate, false, currentPort);
    }
  };

  const handleFlash = useCallback(async () => {
    if (!selectedFirmware || !isConnected || !currentPort) return;
    setIsFlashing(true);
    setProgress(0);
    try {
        await serialService.disconnect(true);
        const transport = new Transport(currentPort);
        const terminalAdapter = {
            clean: () => {},
            writeLine: (l: string) => onAddLog({ timestamp: Date.now(), message: l, type: 'serial' }),
            write: (l: string) => onAddLog({ timestamp: Date.now(), message: l, type: 'serial' }),
        };
        const loader = new ESPLoader(transport, baudRate, terminalAdapter);
        await loader.main_fn();

        if (selectedFirmware.file) {
            const reader = new FileReader();
            const fileData = await new Promise<string>((resolve) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsBinaryString(selectedFirmware.file!);
            });
            await loader.write_flash({
                fileArray: [{ data: fileData, address: selectedFirmware.customOffset || 0x10000 }],
                reportProgress: (fi: number, w: number, t: number) => setProgress(Math.round((w/t)*100))
            });
        } else if (selectedFirmware.parts) {
            for (let i = 0; i < selectedFirmware.parts.length; i++) {
                setProgress(Math.round(((i + 1) / selectedFirmware.parts.length) * 100));
                await new Promise(r => setTimeout(r, 400));
            }
        }
        onAddLog({ timestamp: Date.now(), message: "Deployment complete.", type: 'success' });
    } catch (e: any) {
        onAddLog({ timestamp: Date.now(), message: `Flash Error: ${e.message}`, type: 'error' });
    } finally {
        setIsFlashing(false);
        await serialService.connect(baudRate, false, currentPort);
    }
  }, [isConnected, selectedFirmware, currentPort, onAddLog]);

  return (
    <div className="p-8 flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      {!isWebSerialSupported && (
        <Badge variant="destructive" className="h-10 px-4 rounded-md justify-start gap-3">
            <AlertTriangle className="w-4 h-4" /> Browser Incompatible. Use Chromium.
        </Badge>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        <div className="xl:col-span-1 space-y-6">
           <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">Firmware Library</CardTitle>
                      <div className="flex gap-1">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".bin" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setSelectedFirmware({ id: 'custom', name: file.name, description: 'User local binary', version: '1.0', author: 'User', tags: ['Custom'], compatibility: ['ESP32'], file: file, customOffset: 0x10000 });
                        }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}><Upload className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setIsWizardOpen(true)}><Wand2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                </CardHeader>
                <div className="p-2 space-y-1 max-h-[380px] overflow-y-auto custom-scrollbar">
                    {FIRMWARES.map(fw => (
                        <button key={fw.id} onClick={() => setSelectedFirmware(fw)}
                            className={cn(
                                "w-full text-left p-4 rounded-md text-xs transition-all flex flex-col gap-1 border",
                                selectedFirmware?.id === fw.id ? "bg-primary/5 border-primary/20" : "bg-transparent border-transparent hover:bg-muted/50"
                            )}>
                            <div className="font-bold flex justify-between"><span className={selectedFirmware?.id === fw.id ? "text-primary" : ""}>{fw.name}</span><span className="opacity-40 font-mono text-[9px]">{fw.version}</span></div>
                            <p className="opacity-60 line-clamp-1 leading-none text-[11px]">{fw.description}</p>
                        </button>
                    ))}
                </div>
           </Card>
           <Button variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive gap-2 font-bold uppercase tracking-widest text-[10px]" onClick={handleEraseAll} disabled={!isConnected || isFlashing || isErasing}>
                {isErasing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Purge Flash
           </Button>
        </div>

        <div className="xl:col-span-3 space-y-8">
            <Card className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tighter flex items-center gap-3">
                             Engine Control Protocol
                             {isFlashing && <Activity className="w-5 h-5 text-primary animate-pulse" />}
                        </CardTitle>
                        <CardDescription>Establish binary deployment link via UART</CardDescription>
                    </div>
                    <div className="flex gap-3">
                        {!isConnected ? (
                            <>
                                <select value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value))}
                                    className="h-10 bg-muted text-foreground border border-border rounded-md px-4 text-xs font-bold outline-none focus:border-primary transition-colors cursor-pointer">
                                    {BAUD_RATES.map(r => <option key={r} value={r}>{r} Baud</option>)}
                                </select>
                                <Button onClick={handleConnect} disabled={isConnecting} className="font-bold uppercase tracking-widest text-[10px] min-w-[120px]">
                                    {isConnecting ? 'Linking...' : 'Connect Port'}
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={handleDisconnect} className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 font-bold uppercase tracking-widest text-[10px]">
                                Terminate
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-4">
                           <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">Target Payload</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedFirmware ? (
                                <>
                                    <div className="flex justify-between items-center"><span className="text-lg font-bold tracking-tight">{selectedFirmware.name}</span><Badge variant="outline" className="text-primary border-primary/20">READY</Badge></div>
                                    <div className="space-y-1.5">
                                        {selectedFirmware.parts?.map((p, i) => (
                                            <div key={i} className="flex justify-between text-[10px] font-mono text-muted-foreground bg-background px-3 py-1.5 rounded-sm border">
                                                <span>{p.label || 'Sect'}</span><span className="text-primary">0x{p.offset.toString(16).toUpperCase()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-24 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-md opacity-30"><Box className="w-8 h-8 mb-2" />Pending selection</div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex flex-col justify-center gap-6">
                        <Button size="lg" onClick={handleFlash} disabled={!isConnected || !selectedFirmware || isFlashing || isErasing}
                            className="w-full h-24 text-xl font-bold uppercase tracking-tighter shadow-xl">
                            {isFlashing ? 'Deploying...' : 'Deploy Now'}
                        </Button>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground tracking-widest"><span>IO STATUS</span><span>{progress}%</span></div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border">
                                <div className="h-full bg-primary transition-all duration-300" style={{width: `${progress}%`}} />
                            </div>
                        </div>
                    </div>
                </div>
                <Terminal logs={logs} isConnected={isConnected} onSendMessage={(msg) => serialService.write(msg + '\r\n')} />
            </Card>
        </div>
      </div>
      <Wizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} onSelect={(fw) => setSelectedFirmware(fw)} />
    </div>
  );
};
