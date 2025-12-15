import React, { useState } from 'react';
import { Radio, Mic2, Disc, Sparkles, Globe, Lock } from 'lucide-react';

interface SetupViewProps {
  onStart: (prompt: string, isPublic: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const SetupView: React.FC<SetupViewProps> = ({ onStart, onCancel, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const suggestions = [
    "Lo-fi beats para programar no escuro",
    "Rock clássico para uma viagem de estrada",
    "Pop anos 2000 para cantar no chuveiro",
    "Jazz suave para um jantar romântico"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStart(prompt, isPublic);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 relative">
        <button 
          onClick={onCancel}
          className="absolute -top-12 left-0 text-gray-500 hover:text-white text-sm"
        >
          ← Voltar ao Dashboard
        </button>

        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-1 bg-green-500 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative bg-black p-4 rounded-full border border-green-500/50">
                <Radio className="w-12 h-12 text-green-500" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold brand-font tracking-tighter text-white">
            Criar Nova Estação
          </h1>
          <p className="text-gray-400">
            Descreva a vibe e deixe a IA ser o DJ.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="vibe" className="block text-sm font-medium text-gray-300 ml-1">
                Qual é a vibe de hoje?
              </label>
              <div className="relative">
                <input
                  id="vibe"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Hip-hop futurista..."
                  className="w-full bg-black/50 border border-gray-700 rounded-xl px-5 py-4 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            {/* Toggle Public/Private */}
            <div className="flex items-center gap-4 bg-black/30 p-2 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${isPublic ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Globe className="w-4 h-4" /> Pública
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${!isPublic ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Lock className="w-4 h-4" /> Privada
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                isLoading 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  Sintonizando...
                </>
              ) : (
                <>
                  <Mic2 className="w-5 h-5" />
                  Entrar no Ar
                </>
              )}
            </button>
          </form>

          {/* Suggestions */}
          {!isLoading && (
            <div className="mt-8 space-y-3">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider text-center">Sugestões de Sintonia</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 px-3 py-2 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};