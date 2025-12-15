import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, SkipForward, ExternalLink, RefreshCw, Radio } from 'lucide-react';
import { RadioContent, Track } from '../types';
import { Visualizer } from './Visualizer';
import { generateDJVoice } from '../services/geminiService';

interface RadioPlayerProps {
  content: RadioContent;
  onReset: () => void;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ content, onReset }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDjSpeaking, setIsDjSpeaking] = useState(false);
  const [djAudioBuffer, setDjAudioBuffer] = useState<ArrayBuffer | null>(null);
  const [progress, setProgress] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const djSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const trackTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const currentTrack = content.playlist[currentTrackIndex];

  // Initialize Audio Context and Preload DJ Voice
  useEffect(() => {
    const initAudio = async () => {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      try {
        const audioData = await generateDJVoice(content.djIntro);
        setDjAudioBuffer(audioData);
        // Start the radio experience automatically once audio is ready
        playDjIntro(audioData);
      } catch (e) {
        console.error("Failed to load DJ voice", e);
      }
    };
    initAudio();

    return () => {
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAllAudio = () => {
    if (djSourceRef.current) {
      djSourceRef.current.stop();
    }
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsPlaying(false);
    setIsDjSpeaking(false);
  };

  const playDjIntro = async (buffer: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    
    // Stop any existing sounds
    stopAllAudio();

    setIsDjSpeaking(true);
    setIsPlaying(true);

    const ctx = audioContextRef.current;
    const audioBuffer = await ctx.decodeAudioData(buffer.slice(0)); // clone buffer
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      setIsDjSpeaking(false);
      startTrackSimulation();
    };

    djSourceRef.current = source;
    source.start();
  };

  const startTrackSimulation = () => {
    setIsPlaying(true);
    setProgress(0);
    
    // Simulate a song playing for 10 seconds (demo mode)
    const duration = 10000; // 10 seconds
    const interval = 100;
    
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextTrack();
          return 100;
        }
        return prev + (interval / duration) * 100;
      });
    }, interval);

    trackTimerRef.current = window.setTimeout(() => {
      handleNextTrack();
    }, duration);
  };

  const handleNextTrack = () => {
    // Clear current track timers
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    // Logic for next
    if (currentTrackIndex < content.playlist.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
      startTrackSimulation();
    } else {
      // End of playlist, maybe loop or stop
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      // Resume logic is complex without real audio seek, so we just restart the current phase
      if (isDjSpeaking && djAudioBuffer) {
         playDjIntro(djAudioBuffer);
      } else {
         startTrackSimulation();
      }
    }
  };

  const openSpotify = (track: Track) => {
    const query = encodeURIComponent(`${track.artist} ${track.title}`);
    window.open(`https://open.spotify.com/search/${query}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.15),transparent_50%)]"></div>
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold tracking-widest text-red-500">AO VIVO</span>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="font-bold text-xl brand-font tracking-tight">{content.stationName}</h2>
          <span className="text-xs text-gray-500">104.5 GPT FM</span>
        </div>
        <button onClick={onReset} className="text-gray-400 hover:text-white transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 gap-8">
        
        {/* Album Art / DJ Avatar */}
        <div className="relative group w-full max-w-sm aspect-square">
          <div className={`absolute inset-0 bg-green-500 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${isPlaying ? 'scale-110 opacity-30' : 'scale-90'}`}></div>
          <div className="relative w-full h-full bg-gray-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
            {isDjSpeaking ? (
               <div className="flex flex-col items-center gap-4 animate-pulse">
                 <Radio className="w-32 h-32 text-green-500" />
                 <p className="text-green-500 font-mono text-sm uppercase tracking-widest">DJ GPT falando...</p>
               </div>
            ) : (
               <img 
                 src={`https://picsum.photos/seed/${currentTrack.title.replace(/\s/g, '')}/800/800`} 
                 alt="Album Art"
                 className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
               />
            )}
            
            {/* Vibe overlay text */}
            {!isDjSpeaking && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-20">
                <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">{currentTrack.genre}</p>
                <h3 className="text-2xl font-bold leading-tight mb-1">{currentTrack.title}</h3>
                <p className="text-gray-400 text-lg">{currentTrack.artist}</p>
              </div>
            )}
          </div>
        </div>

        {/* Visualizer & Info */}
        <div className="w-full max-w-md space-y-6">
          <div className="h-16 flex items-center justify-center">
            {isPlaying ? (
              <Visualizer isActive={true} />
            ) : (
              <div className="text-gray-600 font-mono text-sm">PAUSED</div>
            )}
          </div>

          {/* Context / Reason */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 min-h-[80px] flex items-center justify-center text-center">
            <p className="text-sm text-gray-300 italic">
              {isDjSpeaking 
                ? `"${content.djIntro}"`
                : `"${currentTrack.reason}"`
              }
            </p>
          </div>
        </div>
      </main>

      {/* Player Controls Footer */}
      <footer className="relative z-20 bg-gray-900/90 backdrop-blur-xl border-t border-white/10 p-6 pb-8">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          
          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">NOW PLAYING</span>
              <span className="font-bold text-sm truncate max-w-[150px]">
                {isDjSpeaking ? 'Intro do DJ' : currentTrack.title}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={togglePlay}
                className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>
              
              <button 
                onClick={handleNextTrack}
                disabled={isDjSpeaking}
                className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <SkipForward className="w-8 h-8" />
              </button>
            </div>

            <div className="flex justify-end min-w-[100px]">
               {!isDjSpeaking && (
                 <button 
                  onClick={() => openSpotify(currentTrack)}
                  className="flex items-center gap-2 text-xs font-bold text-green-500 hover:text-green-400 transition-colors border border-green-500/30 px-3 py-1.5 rounded-full hover:bg-green-500/10"
                 >
                   <span className="hidden sm:inline">ABRIR NO</span> SPOTIFY <ExternalLink className="w-3 h-3" />
                 </button>
               )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};