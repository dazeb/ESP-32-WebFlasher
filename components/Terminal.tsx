
import React, { useEffect, useRef, useState } from 'react';
import { Send, Terminal as TerminalIcon } from 'lucide-react';
import { LogEntry } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface TerminalProps {
  logs: LogEntry[];
  onSendMessage?: (msg: string) => void;
  isConnected: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onSendMessage, isConnected }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSend = () => {
    if (input && onSendMessage) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="w-full h-80 bg-background border border-border rounded-md overflow-hidden flex flex-col font-mono text-sm">
      <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            <TerminalIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">Monitor Stream</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">{isConnected ? 'Active' : 'Idle'}</span>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto terminal-scroll space-y-0.5 bg-black/5">
        {logs.map((log, i) => (
          <div key={i} className={cn(
            "break-words leading-tight",
            log.type === 'error' ? 'text-destructive' :
            log.type === 'success' ? 'text-primary' :
            log.type === 'warning' ? 'text-amber-500' :
            log.type === 'serial' ? 'text-foreground/80' :
            log.type === 'system' ? 'text-primary font-bold' :
            'text-muted-foreground'
          )}>
            <span className="text-muted-foreground/30 mr-2 select-none text-[9px]">
              {new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}
            </span>
            {log.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="bg-muted/30 border-t border-border p-1.5 flex gap-2 items-center">
        <span className="text-primary font-bold ml-2 shrink-0 text-xs tracking-tighter select-none">TX &gt;</span>
        <Input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isConnected ? "Send protocol command..." : "Serial locked"}
          disabled={!isConnected}
          className="h-8 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/40 px-1 py-0 text-xs"
        />
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSend}
          disabled={!isConnected || !input}
          className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
