import React, { useState } from 'react';
import { Image as ImageIcon, Download, Sparkles, AlertCircle, Key } from 'lucide-react';
import { generateBootLogo } from '../services/geminiService';
import { GeneratedImage } from '../types';

export const LogoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('Pixel art cyber skull with green circuit board background');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const imageUrl = await generateBootLogo(prompt, size);
      setGeneratedImage({
        url: imageUrl,
        prompt,
        size
      });
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
          setError('API Key selection required for Veo/Pro models.');
          // Attempt to prompt selection if possible, though strict error handling usually best
          try {
              await window.aistudio.openSelectKey();
          } catch (e) {
              // ignore
          }
      } else {
        setError('Failed to generate image. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Boot Logo Generator
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Create custom splash screens for your firmware using Gemini 3 Pro.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-32 bg-slate-950 text-white rounded-lg p-3 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none transition-all"
                  placeholder="Describe your logo..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                        size === s
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    {loading ? 'Generating...' : 'Generate Logo'}
                  </button>
              </div>

               {error && (
                <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-red-200">{error}</p>
                        {error.includes('API Key') && (
                             <button onClick={() => window.aistudio.openSelectKey()} className="text-xs text-red-300 underline mt-1 hover:text-white">
                                Open Key Selection
                             </button>
                        )}
                    </div>
                </div>
              )}
            </div>
          </div>
          
           <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
             <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                 <Key className="w-3 h-3" />
                 <span>Billing Info</span>
             </div>
             <p className="text-xs text-slate-500">
                Generating high-res images (2K/4K) with Gemini 3 Pro requires a paid project. 
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 ml-1 underline">
                    Learn more
                </a>
             </p>
           </div>
        </div>

        {/* Preview Area */}
        <div className="bg-black/40 border border-slate-800 rounded-xl p-2 min-h-[400px] flex items-center justify-center relative overflow-hidden group">
          {generatedImage ? (
            <div className="relative w-full h-full flex flex-col items-center">
              <img 
                src={generatedImage.url} 
                alt="Generated Boot Logo" 
                className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl"
              />
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                    href={generatedImage.url} 
                    download={`esp32-bootlogo-${Date.now()}.png`}
                    className="bg-white text-black p-3 rounded-full shadow-lg hover:bg-slate-200 transition-colors flex items-center justify-center"
                >
                    <Download className="w-6 h-6" />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-600 p-8 border-2 border-dashed border-slate-800 rounded-lg w-full h-full flex flex-col items-center justify-center">
                <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>Preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
