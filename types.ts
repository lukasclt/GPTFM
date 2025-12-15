export interface User {
  id: string;
  username: string;
  avatar: string;
}

export interface Track {
  artist: string;
  title: string;
  genre: string;
  reason: string;
  requestedBy?: string; // Username of requester
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RadioContent {
  id: string;
  ownerId: string; // ID do criador
  ownerName: string;
  stationName: string;
  isPublic: boolean;
  vibe: string;
  djIntro: string;
  playlist: Track[];
  likes: number;
  listeners: number;
}

export enum AppState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}

export interface PlayerState {
  currentTrackIndex: number;
  isPlaying: boolean;
  isDjSpeaking: boolean;
  isAdBreak: boolean;
  lastAdTime: number;
}