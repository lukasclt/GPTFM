export interface Track {
  artist: string;
  title: string;
  genre: string;
  reason: string; // Why the AI picked this song
}

export interface RadioContent {
  stationName: string;
  djIntro: string; // Text script for the DJ
  playlist: Track[];
}

export enum AppState {
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}

export interface PlayerState {
  currentTrackIndex: number;
  isPlaying: boolean;
  isDjSpeaking: boolean;
  currentTime: number; // Simulated progress
  duration: number; // Simulated duration
}