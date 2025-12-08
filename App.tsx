import React, { useState } from 'react';
import { Github, Wifi } from 'lucide-react';
import { Flasher } from './components/Flasher';
import { LogEntry } from './types';
import { TERMINAL_GREETING } from './constants';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: Date.now(), message: TERMINAL_GREETING.trim(), type: 'info' }
  ]);

  const addLog = (log: LogEntry) => {
    setLogs(prev => [...prev.slice(-99), log]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <Wifi className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  ESP32 FlashOps
                </h1>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Pro Pentest Flasher</p>
              </div>
            </div>

            <div className="hidden md:flex items-center">
               <a href="#" className="text-slate-500 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
               </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Flasher onAddLog={addLog} logs={logs} />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-600">
            <p>Use responsibly. This tool is for educational and authorized security testing purposes only.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;