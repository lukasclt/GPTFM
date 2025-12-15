import React, { useState } from 'react';
import { Radio, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { loginUser, registerUser } from '../db';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error("Por favor, preencha todos os campos.");
      }

      let user: User;

      if (isLoginView) {
        // Login Logic
        user = await loginUser(username, password);
      } else {
        // Register Logic
        user = await registerUser(username, password);
      }

      // Success
      onLogin(user);

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
       {/* Background Effects */}
       <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-500/20 blur-[120px] rounded-full pointer-events-none"></div>
       <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-black p-3 rounded-2xl border border-green-500/30 mb-4 shadow-lg shadow-green-500/10">
            <Radio className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold brand-font text-white">GPT<span className="text-green-500">FM</span></h1>
          <p className="text-gray-400 text-sm mt-2">A frequência do futuro.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-200 text-sm animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 ml-1">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder-gray-600"
              placeholder="Seu nome de DJ..."
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder-gray-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 group ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLoginView ? 'Entrar na Estação' : 'Criar Conta'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={toggleView}
            className="text-sm text-gray-500 hover:text-green-400 transition-colors focus:outline-none"
          >
            {isLoginView ? 'Não tem conta? Registre-se agora' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};