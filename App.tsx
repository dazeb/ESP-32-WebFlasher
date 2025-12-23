import React, { useState } from 'react';
import { 
  Info, LayoutGrid, Database, Box, FolderOpen, HardDrive, 
  Layers, Cpu, Terminal as TerminalIcon, Bot, Sparkles, 
  Github, Wifi, Settings, HelpCircle, ChevronRight,
  Download, Zap
} from 'lucide-react';
import { Flasher } from './components/Flasher';
import { Assistant } from './components/Assistant';
import { LogoGenerator } from './components/LogoGenerator';
import { Section, LogEntry, ChipInfo, Partition } from './types';
import { TERMINAL_GREETING } from './constants';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { cn } from './lib/utils';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('flash-tools');
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: Date.now(), message: TERMINAL_GREETING.trim(), type: 'info' }
  ]);
  const [chipInfo, setChipInfo] = useState<ChipInfo | null>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addLog = (log: LogEntry) => {
    setLogs(prev => [...prev.slice(-199), log]);
  };

  const menuItems = [
    { id: 'device-info', label: 'Device Info', icon: Info, group: 'Sections' },
    { id: 'partitions', label: 'Partitions', icon: LayoutGrid, group: 'Sections' },
    { id: 'nvs', label: 'NVS Inspector', icon: Database, group: 'Sections' },
    { id: 'apps', label: 'Apps', icon: Box, group: 'Sections' },
    { id: 'spiffs', label: 'SPIFFS Tools', icon: FolderOpen, group: 'Sections' },
    { id: 'littlefs', label: 'LittleFS Tools', icon: HardDrive, group: 'Sections' },
    { id: 'fatfs', label: 'FATFS Tools', icon: Layers, group: 'Sections' },
    { id: 'flash-tools', label: 'Flash Tools', icon: Cpu, group: 'Sections' },
    { id: 'serial-monitor', label: 'Serial Monitor', icon: TerminalIcon, group: 'Sections' },
    { id: 'assistant', label: 'AI Assistant', icon: Bot, group: 'Intelligence' },
    { id: 'logo-gen', label: 'Logo Generator', icon: Sparkles, group: 'Intelligence' },
    { id: 'about', label: 'About', icon: HelpCircle, group: 'System' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'flash-tools':
      case 'serial-monitor':
        return (
          <Flasher 
            onAddLog={addLog} 
            logs={logs} 
            onChipInfo={setChipInfo} 
            onPartitionsDiscovered={setPartitions}
            onConnectionChange={setIsConnected} 
          />
        );
      case 'assistant':
        return <Assistant />;
      case 'logo-gen':
        return <LogoGenerator />;
      case 'device-info':
        return (
          <div className="p-8 space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tighter flex items-center gap-3">
                  <Info className="w-6 h-6 text-primary" /> System Dashboard
                </h2>
             </div>
             {chipInfo ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <InfoCard title="Silicon" value={chipInfo.chipName} sub="CPU Core Architecture" icon={Cpu} />
                 <InfoCard title="Hardware ID" value={chipInfo.mac} sub="MAC Address Signature" icon={Wifi} />
                 <InfoCard title="Total Storage" value={chipInfo.flashSize} sub="Flash Partition Capacity" icon={HardDrive} />
                 <Card className="col-span-full">
                    <CardHeader>
                      <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Device Capabilities</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {chipInfo.features.map(feat => (
                        <Badge key={feat} variant="outline" className="bg-muted/50">{feat}</Badge>
                      ))}
                    </CardContent>
                 </Card>
               </div>
             ) : (
               <EmptyState icon={Cpu} message="No device connected. Use Flash Tools to establish a link." />
             )}
          </div>
        );
      case 'partitions':
        return (
          <div className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
             <h2 className="text-2xl font-bold tracking-tighter flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-primary" /> Partition Table
             </h2>
             {partitions.length > 0 ? (
               <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Offset</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partitions.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono font-bold text-primary">{p.label}</TableCell>
                          <TableCell>
                            <Badge variant={p.type === 0 ? 'default' : 'secondary'}>{p.typeLabel}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.readableOffset}</TableCell>
                          <TableCell className="font-mono text-xs">{p.readableSize}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-2">
                              <Download className="w-3 h-3" /> Dump
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </Card>
             ) : (
               <EmptyState icon={LayoutGrid} message="Partition table inaccessible. Connect device first." />
             )}
          </div>
        );
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
             <Settings className="w-16 h-16 mb-6 opacity-20" />
             <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter text-foreground/50">Section In Development</h2>
             <p className="max-w-md text-sm">Advanced hooks for {activeSection} are in progress.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">
      <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0 z-40">
        <div className="p-8 border-b border-border">
           <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-md border border-primary/20 shadow-sm">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tighter leading-none">FlashOps</h1>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">ESP32 Suite</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-10 custom-scrollbar">
          {['Sections', 'Intelligence', 'System'].map((group) => (
            <div key={group}>
              <h3 className="px-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{group}</h3>
              <div className="space-y-1">
                {menuItems.filter(item => item.group === group).map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as Section)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-md text-xs font-semibold transition-all group",
                      activeSection === item.id 
                        ? "bg-accent text-accent-foreground border border-border shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", activeSection === item.id ? "text-primary" : "group-hover:text-primary")} />
                    <span className="uppercase tracking-wide">{item.label}</span>
                    {activeSection === item.id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-border bg-muted/20">
           <div className={cn(
             "flex items-center gap-3 p-3 rounded-md border",
             isConnected ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"
           )}>
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" : "bg-destructive")} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {isConnected ? 'Active Link' : 'No Connection'}
              </span>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 text-sm">
             <span className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">Workspace</span>
             <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
             <span className="text-foreground font-bold uppercase tracking-widest text-[10px]">{activeSection.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-6">
             {/* Fix: Removed non-existent asChild property from Button to resolve TypeScript error */}
             <Button variant="ghost" size="icon" className="rounded-md">
                <a href="https://github.com" target="_blank" rel="noreferrer"><Github className="w-5 h-5" /></a>
             </Button>
             <div className="h-6 w-px bg-border" />
             <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                API: v2.0
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, message }: any) => (
  <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground bg-muted/10">
    <Icon className="w-12 h-12 mb-4 opacity-10" />
    <p className="font-bold text-xs tracking-widest uppercase opacity-40 text-center px-4 leading-relaxed">{message}</p>
  </div>
);

const InfoCard = ({ title, value, sub, icon: Icon }: any) => {
  return (
    <Card className="transition-all hover:border-primary/40 hover:shadow-md group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
        <div className="p-2 rounded-md bg-muted text-primary border border-border group-hover:bg-primary/5 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{sub}</CardDescription>
      </CardContent>
    </Card>
  );
};

export default App;