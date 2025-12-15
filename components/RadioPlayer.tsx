import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, ExternalLink, RefreshCw, Radio, ThumbsUp, ThumbsDown, MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { RadioContent, Track, User, ChatMessage } from '../types';
import { Visualizer } from './Visualizer';
import { generateDJVoice, generateAdScript, evaluateSongRequest } from '../services/geminiService';
import { ChatWindow } from './ChatWindow';
import { playSpotifyTrack, pauseSpotify, searchSpotifyTrack } from '../services/spotifyService';

interface RadioPlayerProps {
  content: RadioContent;
  user: User;
  onExit: () => void;
  spotifyToken: string | null;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ content: initialContent, user, onExit, spotifyToken }) => {
  const [content, setContent] = useState(initialContent);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDjSpeaking, setIsDjSpeaking] = useState(false);
  const [isAdBreak, setIsAdBreak] = useState(false);
  const [progress, setProgress] = useState(0);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  
  // Interaction State
  const [likes, setLikes] = useState(initialContent.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [showChat, setShowChat] = useState(false); // Mobile toggle
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestQuery, setRequestQuery] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', userId: 'sys', username: 'System', text: `Bem-vindo à rádio ${initialContent.stationName}!`, timestamp: Date.now(), isSystem: true }
  ]);

  // Ad Timer
  const [lastAdTime, setLastAdTime] = useState(Date.now());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const djSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const trackTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const adCheckIntervalRef = useRef<number | null>(null);
  const spotifyPlayerRef = useRef<any>(null);

  const currentTrack = content.playlist[currentTrackIndex];

  // --- Initialization ---

  useEffect(() => {
    // 1. Setup Audio Context for DJ
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 2. Setup Spotify SDK if token exists
    if (spotifyToken) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        const player = new (window as any).Spotify.Player({
          name: 'GPTFM Web Player',
          getOAuthToken: (cb: any) => { cb(spotifyToken); },
          volume: 0.5
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('Ready with Device ID', device_id);
          setSpotifyDeviceId(device_id);
          setIsSpotifyReady(true);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Device ID has gone offline', device_id);
          setIsSpotifyReady(false);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (!state) return;
          // Sync Spotify progress with our UI if simulating
          if (state.paused && state.position === 0 && state.restrictions.disallow_resuming_reasons && state.restrictions.disallow_resuming_reasons.length === 0) {
             // Track finished naturally?
          }
        });

        player.connect();
        spotifyPlayerRef.current = player;
      };
    }

    // 3. Start Intro
    initIntro();

    // 4. Ad Loop
    adCheckIntervalRef.current = window.setInterval(checkAdBreak, 30000);

    return () => {
      stopAllAudio();
      if (adCheckIntervalRef.current) clearInterval(adCheckIntervalRef.current);
      if (spotifyPlayerRef.current) spotifyPlayerRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initIntro = async () => {
     try {
        const audioData = await generateDJVoice(content.djIntro);
        playDjIntro(audioData);
      } catch (e) {
        console.error("Failed to load DJ voice", e);
        // Fallback start
        startTrack();
      }
  };

  // --- Playback Logic ---

  const stopAllAudio = () => {
    if (djSourceRef.current) {
      djSourceRef.current.stop();
    }
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    if (spotifyToken && spotifyPlayerRef.current) {
      spotifyPlayerRef.current.pause();
    }
    
    setIsPlaying(false);
    setIsDjSpeaking(false);
  };

  const playAudioBuffer = async (buffer: ArrayBuffer, onEnded: () => void) => {
     if (!audioContextRef.current) return;
     const ctx = audioContextRef.current;
     // Ensure context is running (browser policy)
     if (ctx.state === 'suspended') await ctx.resume();

     const audioBuffer = await ctx.decodeAudioData(buffer.slice(0));
     const source = ctx.createBufferSource();
     source.buffer = audioBuffer;
     source.connect(ctx.destination);
     source.onended = onEnded;
     djSourceRef.current = source;
     source.start();
  };

  const playDjIntro = async (buffer: ArrayBuffer) => {
    // Stop Spotify before speaking
    if (spotifyToken) pauseSpotify(spotifyToken);
    
    setIsDjSpeaking(true);
    setIsPlaying(true);
    await playAudioBuffer(buffer, () => {
      setIsDjSpeaking(false);
      startTrack();
    });
  };

  const startTrack = async () => {
    setIsPlaying(true);
    setProgress(0);

    // If Spotify is ready and we have a URI, play for real
    if (spotifyToken && spotifyDeviceId && currentTrack.spotifyUri) {
       await playSpotifyTrack(spotifyToken, spotifyDeviceId, currentTrack.spotifyUri);
       
       // Use real duration or fallback to 30s
       const duration = currentTrack.durationMs || 30000;
       const interval = 1000;
       
       // Poll progress from SDK or simulate visual progress
       progressIntervalRef.current = window.setInterval(() => {
          setProgress(prev => {
             if (prev >= 100) return 100;
             return prev + (interval / duration) * 100;
          });
       }, interval);

       // Set timeout to go to next track (simpler than strictly listening to events for now)
       trackTimerRef.current = window.setTimeout(() => {
         handleNextTrack();
       }, duration - 2000); // Crossfade ish

    } else {
      // Simulation Mode
      const duration = 15000; 
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
    }
  };

  const handleNextTrack = () => {
    stopAllAudio();

    // Logic: Intro -> Track 1 -> DJ Comment -> Track 2 -> Ad? -> Track 3
    // For simplicity: DJ speaks every 2 songs
    const shouldDjSpeak = (currentTrackIndex + 1) % 2 === 0;

    if (currentTrackIndex < content.playlist.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
      
      if (shouldDjSpeak) {
         playDjBridge(content.playlist[currentTrackIndex + 1]);
      } else {
         setTimeout(startTrack, 500); // Small delay
      }

    } else {
      // Loop Playlist
      setCurrentTrackIndex(0);
      playDjBridge(content.playlist[0]);
    }
  };

  const playDjBridge = async (nextTrack: Track) => {
    const bridgeText = `Isso foi ${currentTrack.artist}. A seguir, ${nextTrack.title} de ${nextTrack.artist}.`;
    try {
      const audio = await generateDJVoice(bridgeText);
      playDjIntro(audio); // Reuse Intro logic
    } catch {
      startTrack();
    }
  };

  // --- Ad Logic ---

  const checkAdBreak = () => {
    const AD_INTERVAL = 5 * 60 * 1000; // 5 mins
    if (Date.now() - lastAdTime > AD_INTERVAL && !isDjSpeaking) {
      triggerAdBreak();
    }
  };

  const triggerAdBreak = async () => {
    stopAllAudio();
    setIsAdBreak(true);
    setIsPlaying(true);
    
    addMessage({ id: crypto.randomUUID(), userId: 'sys', username: 'Anúncio', text: 'Intervalo comercial.', timestamp: Date.now(), isSystem: true });

    try {
      const adScript = await generateAdScript(content.stationName);
      const audioData = await generateDJVoice(adScript);
      await playAudioBuffer(audioData, () => {
        setIsAdBreak(false);
        setLastAdTime(Date.now());
        startTrack(); 
      });
    } catch (e) {
      setIsAdBreak(false);
      startTrack();
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (spotifyToken && spotifyPlayerRef.current) spotifyPlayerRef.current.pause();
      if (djSourceRef.current) djSourceRef.current.stop(); // Can't pause AudioBufferSource, must stop
      if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsPlaying(false);
    } else {
      if (isDjSpeaking) {
         // Restart DJ logic is hard with buffer, better to just skip to track
         setIsDjSpeaking(false);
         startTrack();
      } else {
         if (spotifyToken && spotifyPlayerRef.current) spotifyPlayerRef.current.resume();
         setIsPlaying(true);
         // Resume progress timer (simplified, actually resets duration)
         startTrack();
      }
    }
  };

  // --- Interaction Logic ---

  const handleLike = () => {
    if (hasLiked) {
      setLikes(prev => prev - 1);
      setHasLiked(false);
    } else {
      setLikes(prev => prev + 1);
      setHasLiked(true);
      addMessage({ id: crypto.randomUUID(), userId: 'sys', username: 'System', text: `${user.username} curtiu a rádio! ❤️`, timestamp: Date.now(), isSystem: true });
    }
  };

  const addMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleSendMessage = (text: string) => {
    addMessage({ id: crypto.randomUUID(), userId: user.id, username: user.username, text: text, timestamp: Date.now() });
  };

  const handleRequestSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestQuery.trim()) return;
    setIsRequesting(true);
    
    const result = await evaluateSongRequest(requestQuery, content.vibe);
    
    if (result) {
      let newTrack: Track = { ...result, requestedBy: user.username };
      
      // Resolve Spotify Data for request
      if (spotifyToken) {
         const spotData = await searchSpotifyTrack(spotifyToken, result.artist, result.title);
         if (spotData) {
            newTrack = { ...newTrack, spotifyUri: spotData.uri, imageUrl: spotData.imageUrl, durationMs: spotData.durationMs };
         }
      }

      const newPlaylist = [...content.playlist];
      newPlaylist.splice(currentTrackIndex + 1, 0, newTrack);
      setContent(prev => ({ ...prev, playlist: newPlaylist }));
      
      setShowRequestModal(false);
      setRequestQuery('');
      addMessage({ id: crypto.randomUUID(), userId: 'sys', username: 'DJ AI', text: `Pedido aceito! "${result.title}" vai tocar a seguir.`, timestamp: Date.now(), isSystem: true });
    } else {
      alert("O DJ achou que essa música não combina com a vibe atual!");
    }
    setIsRequesting(false);
  };

  const openSpotify = (track: Track) => {
    const query = encodeURIComponent(`${track.artist} ${track.title}`);
    window.open(`https://open.spotify.com/search/${query}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.1),transparent_60%)] pointer-events-none"></div>

      {/* LEFT COLUMN: PLAYER */}
      <div className={`flex-1 flex flex-col relative z-10 transition-all duration-300 ${showChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-white/5">
          <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <h2 className="font-bold text-xl brand-font tracking-tight flex items-center gap-2">
              {content.stationName}
              {!content.isPublic && <span className="bg-gray-800 text-[10px] px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">PRIVADA</span>}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
               <span className="flex items-center gap-1"><Radio className="w-3 h-3" /> 104.5 GPT FM</span>
               {spotifyToken && (
                 <span className={`w-2 h-2 rounded-full ${isSpotifyReady ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} title={isSpotifyReady ? "Spotify Ready" : "Connecting Spotify"}></span>
               )}
            </div>
          </div>
          <button onClick={() => setShowChat(!showChat)} className="md:hidden p-2 text-gray-400 hover:text-white">
            <MessageSquare className="w-5 h-5" />
          </button>
        </header>

        {/* Main Player Visuals */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          
          <div className="relative group w-full max-w-sm aspect-square">
            {isAdBreak && (
               <div className="absolute inset-0 z-50 bg-yellow-500/20 backdrop-blur-sm rounded-3xl border border-yellow-500/50 flex flex-col items-center justify-center text-center p-6 animate-pulse">
                  <h3 className="text-2xl font-bold text-yellow-500 mb-2">INTERVALO COMERCIAL</h3>
                  <p className="text-white text-sm">Voltamos em instantes...</p>
               </div>
            )}

            <div className={`absolute inset-0 bg-green-500 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${isPlaying ? 'scale-110 opacity-30' : 'scale-90'}`}></div>
            <div className="relative w-full h-full bg-gray-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
              {isDjSpeaking ? (
                 <div className="flex flex-col items-center gap-4 animate-pulse">
                   <Radio className="w-32 h-32 text-green-500" />
                   <p className="text-green-500 font-mono text-sm uppercase tracking-widest">DJ GPT falando...</p>
                 </div>
              ) : (
                 <img 
                   src={currentTrack.imageUrl || `https://picsum.photos/seed/${currentTrack.title.replace(/\s/g, '')}/800/800`} 
                   alt="Album Art"
                   className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                 />
              )}
              
              {!isDjSpeaking && !isAdBreak && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-20">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">{currentTrack.genre}</p>
                      <h3 className="text-2xl font-bold leading-tight mb-1">{currentTrack.title}</h3>
                      <p className="text-gray-400 text-lg">{currentTrack.artist}</p>
                    </div>
                    {currentTrack.requestedBy && (
                      <div className="bg-green-500/20 px-2 py-1 rounded text-[10px] text-green-400 border border-green-500/30">
                        Pedido por @{currentTrack.requestedBy}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-md space-y-4">
            <div className="h-12 flex items-center justify-center">
              {isPlaying ? <Visualizer isActive={true} /> : <div className="text-gray-600 font-mono text-sm">PAUSED</div>}
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-4 min-h-[60px] flex items-center justify-center text-center">
              <p className="text-sm text-gray-300 italic">
                {isDjSpeaking ? `"${content.djIntro}"` : `"${currentTrack.reason}"`}
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
               <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${hasLiked ? 'bg-green-500 text-black border-green-500' : 'bg-transparent text-gray-400 border-gray-700 hover:border-white'}`}>
                 <ThumbsUp className="w-4 h-4" /> <span className="text-xs font-bold">{likes}</span>
               </button>
               <button onClick={() => setShowRequestModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-white transition-all bg-transparent">
                 <Radio className="w-4 h-4" /> <span className="text-xs font-bold">Pedir Música</span>
               </button>
            </div>
          </div>
        </main>

        <footer className="bg-gray-900/90 backdrop-blur-xl border-t border-white/10 p-6 pb-8">
          <div className="max-w-2xl mx-auto w-full space-y-4">
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-300 ease-linear" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">NOW PLAYING</span>
                <span className="font-bold text-sm truncate max-w-[150px]">
                  {isDjSpeaking ? 'Intro do DJ' : (isAdBreak ? 'Comercial' : currentTrack.title)}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={togglePlay} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
                <button onClick={handleNextTrack} disabled={isDjSpeaking || isAdBreak} className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                  <SkipForward className="w-8 h-8" />
                </button>
              </div>
              <div className="flex justify-end min-w-[100px]">
                 {!isDjSpeaking && !isAdBreak && (
                   <button onClick={() => openSpotify(currentTrack)} className={`flex items-center gap-2 text-xs font-bold transition-colors border px-3 py-1.5 rounded-full ${spotifyToken ? 'text-[#1DB954] border-[#1DB954]/50 hover:bg-[#1DB954]/10' : 'text-green-500 hover:text-green-400 border-green-500/30 hover:bg-green-500/10'}`}>
                     <span className="hidden sm:inline">SPOTIFY</span> <ExternalLink className="w-3 h-3" />
                   </button>
                 )}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* RIGHT COLUMN: CHAT */}
      <div className={`w-full md:w-80 border-l border-white/10 bg-black z-20 md:flex flex-col ${showChat ? 'flex fixed inset-0 md:static' : 'hidden'}`}>
        <div className="md:hidden flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="font-bold text-white">Chat ao Vivo</h3>
          <button onClick={() => setShowChat(false)} className="text-gray-400">Fechar</button>
        </div>
        <ChatWindow user={user} onSendMessage={handleSendMessage} messages={messages} />
      </div>

      {/* REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-bold mb-2">Pedir Música</h3>
            <p className="text-sm text-gray-400 mb-4">A IA vai analisar se combina com a vibe "{content.vibe}".</p>
            <form onSubmit={handleRequestSong}>
              <input
                type="text"
                value={requestQuery}
                onChange={(e) => setRequestQuery(e.target.value)}
                placeholder="Nome da música e artista..."
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isRequesting}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-3 bg-gray-800 rounded-lg font-bold hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={isRequesting} className="flex-1 py-3 bg-green-500 text-black rounded-lg font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-2">
                  {isRequesting ? 'Analisando...' : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};