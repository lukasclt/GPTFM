import React, { useState, useEffect } from 'react';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { SetupView } from './components/SetupView';
import { RadioPlayer } from './components/RadioPlayer';
import { generateRadioStation } from './services/geminiService';
import { getTokenFromUrl, cleanUrl } from './services/spotifyService';
import { saveStation, saveUser, getUser } from './db';
import { RadioContent, AppState, User } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [user, setUser] = useState<User | null>(null);
  const [radioContent, setRadioContent] = useState<RadioContent | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  // Check for Spotify Token and Session on Mount
  useEffect(() => {
    const token = getTokenFromUrl();
    if (token) {
      setSpotifyToken(token);
      window.localStorage.setItem('spotify_token', token);
      cleanUrl();
    } else {
      const storedToken = window.localStorage.getItem('spotify_token');
      if (storedToken) setSpotifyToken(storedToken);
    }

    // Check for existing user session
    const storedUser = window.localStorage.getItem('gptfm_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setAppState(AppState.DASHBOARD);
    }
  }, []);

  const handleLogin = async (loggedInUser: User) => {
    // Check if user exists in DB, if not save
    const existing = await getUser(loggedInUser.username);
    if (!existing) {
      await saveUser(loggedInUser);
    } else {
      // Restore user ID from DB if matched by username
      loggedInUser.id = existing.id;
    }
    
    setUser(loggedInUser);
    window.localStorage.setItem('gptfm_user', JSON.stringify(loggedInUser));
    setAppState(AppState.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setRadioContent(null);
    window.localStorage.removeItem('gptfm_user');
    setAppState(AppState.AUTH);
  };

  const handleCreateNew = () => {
    setAppState(AppState.SETUP);
  };

  const handleStartRadio = async (prompt: string, isPublic: boolean) => {
    if (!user) return;
    setAppState(AppState.LOADING);
    try {
      const content = await generateRadioStation(prompt, { id: user.id, name: user.username }, isPublic);
      
      // Save to DB
      await saveStation(content);

      setRadioContent(content);
      setAppState(AppState.PLAYING);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      setTimeout(() => setAppState(AppState.SETUP), 3000);
    }
  };

  const handleSelectStation = (station: RadioContent) => {
    setRadioContent(station);
    setAppState(AppState.PLAYING);
  };

  const handleExitPlayer = () => {
    setRadioContent(null);
    setAppState(AppState.DASHBOARD);
  };

  return (
    <div className="w-full min-h-screen">
      {appState === AppState.AUTH && (
        <AuthView onLogin={handleLogin} />
      )}

      {appState === AppState.DASHBOARD && user && (
        <DashboardView 
          user={user} 
          onCreateNew={handleCreateNew} 
          onSelectStation={handleSelectStation} 
          onLogout={handleLogout}
          spotifyToken={spotifyToken}
        />
      )}

      {appState === AppState.SETUP && (
        <SetupView 
          onStart={handleStartRadio} 
          onCancel={() => setAppState(AppState.DASHBOARD)}
          isLoading={false} 
        />
      )}
      
      {appState === AppState.LOADING && (
        <SetupView 
          onStart={() => {}} 
          onCancel={() => {}}
          isLoading={true} 
        />
      )}

      {appState === AppState.ERROR && (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-red-500">Interferência no Sinal</h2>
          <p className="text-gray-400 max-w-md">
            Não foi possível sintonizar a estação agora. Tente novamente.
          </p>
        </div>
      )}

      {appState === AppState.PLAYING && radioContent && user && (
        <RadioPlayer 
          content={radioContent} 
          user={user}
          onExit={handleExitPlayer} 
          spotifyToken={spotifyToken}
        />
      )}
    </div>
  );
}

export default App;