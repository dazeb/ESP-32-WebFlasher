import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col font-mono text-sm shadow-inner shadow-black/50">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Serial Monitor</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto terminal-scroll space-y-1">
        {logs.map((log, i) => (
          <div key={i} className={`break-words ${
            log.type === 'error' ? 'text-red-400' :
            log.type === 'success' ? 'text-emerald-400' :
            log.type === 'warning' ? 'text-amber-400' :
            log.type === 'serial' ? 'text-cyan-200' :
            'text-slate-300'
          }`}>
            <span className="text-slate-600 mr-2 select-none">
              [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
            </span>
            {log.message}
          </div>
        ))}
        <div className="flex items-center text-emerald-500 mt-2">
            <span className="mr-2">$</span>
            <span className="w-2 h-4 bg-emerald-500 cursor-blink"></span>
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
};
