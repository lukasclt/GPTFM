import React, { useState } from 'react';
import { SetupView } from './components/SetupView';
import { RadioPlayer } from './components/RadioPlayer';
import { generateRadioStation } from './services/geminiService';
import { RadioContent, AppState } from './types';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [radioContent, setRadioContent] = useState<RadioContent | null>(null);

  const handleStartRadio = async (prompt: string) => {
    setAppState(AppState.LOADING);
    try {
      const content = await generateRadioStation(prompt);
      setRadioContent(content);
      setAppState(AppState.PLAYING);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      // Simple error recovery
      setTimeout(() => setAppState(AppState.SETUP), 3000);
    }
  };

  const handleReset = () => {
    setAppState(AppState.SETUP);
    setRadioContent(null);
  };

  return (
    <div className="w-full min-h-screen">
      {appState === AppState.SETUP && (
        <SetupView 
          onStart={handleStartRadio} 
          isLoading={false} 
        />
      )}
      
      {appState === AppState.LOADING && (
        <SetupView 
          onStart={() => {}} 
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
            Não foi possível sintonizar a estação agora. A IA pode estar sobrecarregada ou a chave de API está inválida.
          </p>
          <p className="text-sm text-gray-600">Reiniciando sistema...</p>
        </div>
      )}

      {appState === AppState.PLAYING && radioContent && (
        <RadioPlayer 
          content={radioContent} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
}

export default App;