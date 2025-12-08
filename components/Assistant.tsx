import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ExternalLink, Search, Sparkles } from 'lucide-react';
import { generateFirmwareAdvice } from '../services/geminiService';
import { ChatMessage } from '../types';

export const Assistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: "Hello! I'm your ESP32 FlashOps assistant. Ask me about compatible hardware, wiring diagrams, or details about any specific firmware like Marauder or Meshtastic." }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Add a temporary thinking message
      const thinkingId = 'thinking-' + Date.now();
      setMessages(prev => [...prev, { id: thinkingId, role: 'model', text: 'Searching and thinking...', isThinking: true }]);

      const response = await generateFirmwareAdvice(userMsg.text, messages);

      // Remove thinking, add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingId);
        return [...filtered, { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: response.text,
          groundingUrls: response.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean)
        }];
      });
    } catch (error) {
      setMessages(prev => prev.filter(m => !m.isThinking));
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Sorry, I encountered an error connecting to the knowledge base.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70">
                {msg.role === 'model' ? <Bot className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full bg-white/20" />}
                <span className="text-xs font-bold uppercase">{msg.role === 'model' ? 'AI Assistant' : 'You'}</span>
              </div>
              
              {msg.isThinking ? (
                <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                  <Search className="w-4 h-4" />
                  <span className="text-sm italic">Accessing Google Search...</span>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm">
                   <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              )}

              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <Search className="w-3 h-3" /> Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.slice(0, 3).map((url, i) => (
                      <a 
                        key={i} 
                        href={url.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs bg-slate-900/50 hover:bg-slate-900 text-blue-400 px-2 py-1 rounded transition-colors border border-slate-700 hover:border-blue-500/50"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{url.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about Marauder, pinouts, or flashing errors..."
            className="w-full bg-slate-800 text-white rounded-xl py-3 pl-4 pr-12 border border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-2">
            Powered by Gemini 2.5 Flash with Google Search Grounding
        </p>
      </div>
    </div>
  );
};
