import React, { useEffect, useState } from 'react';
import { Plus, Radio, Users, Globe, Lock, Play, LogOut, Music } from 'lucide-react';
import { RadioContent, User } from '../types';
import { getPublicStations, getUserStations } from '../db';
import { getSpotifyLoginUrl } from '../services/spotifyService';

interface DashboardViewProps {
  user: User;
  onCreateNew: () => void;
  onSelectStation: (station: RadioContent) => void;
  onLogout: () => void;
  spotifyToken: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onCreateNew, onSelectStation, onLogout, spotifyToken }) => {
  const [myStations, setMyStations] = useState<RadioContent[]>([]);
  const [publicStations, setPublicStations] = useState<RadioContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userSt = await getUserStations(user.id);
        const pubSt = await getPublicStations();
        
        // Filter out my own stations from public list to avoid duplicates visually
        const otherPublic = pubSt.filter(s => s.ownerId !== user.id);
        
        setMyStations(userSt);
        setPublicStations(otherPublic);
      } catch (e) {
        console.error("Failed to load stations from DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user.id]);

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 pt-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20">
            <Radio className="w-6 h-6 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold brand-font">GPT<span className="text-green-500">FM</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {!spotifyToken ? (
            <a 
              href={getSpotifyLoginUrl()}
              className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold px-4 py-2 rounded-full transition-colors"
            >
              <Music className="w-4 h-4" />
              CONECTAR SPOTIFY
            </a>
          ) : (
             <div className="flex items-center gap-2 bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/50 text-xs font-bold px-4 py-2 rounded-full">
              <Music className="w-4 h-4" />
              SPOTIFY CONECTADO
            </div>
          )}

          <div className="flex items-center gap-3 bg-gray-900 rounded-full pl-1 pr-4 py-1 border border-white/10">
            <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full bg-gray-800" />
            <span className="text-sm font-medium text-gray-300">@{user.username}</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        {/* Minhas Estações / Criar */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            Suas Estações
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <button 
              onClick={onCreateNew}
              className="group h-48 rounded-3xl border-2 border-dashed border-gray-800 hover:border-green-500/50 bg-gray-900/20 hover:bg-gray-900/50 flex flex-col items-center justify-center gap-4 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-green-500/20">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-400 group-hover:text-white">Criar Nova Rádio IA</span>
            </button>

            {myStations.map((station) => (
               <StationCard key={station.id} station={station} onSelect={onSelectStation} />
            ))}
          </div>
        </section>

        {/* Estações Públicas (Banco de Dados) */}
        <section>
           <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
            Explorar Estações
          </h2>
          {isLoading ? (
            <div className="text-gray-500 text-sm">Carregando frequências...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicStations.length > 0 ? publicStations.map((station) => (
                <StationCard key={station.id} station={station} onSelect={onSelectStation} />
              )) : (
                 <div className="col-span-3 text-center py-10 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                    Nenhuma rádio pública encontrada no momento. Seja o primeiro a criar!
                 </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const StationCard = ({ station, onSelect }: { station: RadioContent, onSelect: (s: RadioContent) => void }) => (
  <div 
    onClick={() => onSelect(station)}
    className="group relative bg-gray-900 rounded-3xl p-6 border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 cursor-pointer overflow-hidden h-48 flex flex-col justify-between"
  >
    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
        <Play className="w-4 h-4 text-black ml-1" />
      </div>
    </div>

    <div>
      <div className="flex justify-between items-start mb-2">
        <div className="px-2 py-1 bg-white/5 rounded-md text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
          {station.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {station.isPublic ? 'Pública' : 'Privada'}
        </div>
      </div>
      <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors truncate">
        {station.stationName}
      </h3>
      <p className="text-sm text-gray-500">por @{station.ownerName}</p>
    </div>

    <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/5 pt-4">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {station.listeners} ouvintes
        </div>
        <div className="truncate max-w-[120px] italic opacity-70">
          "{station.vibe}"
        </div>
    </div>
  </div>
);