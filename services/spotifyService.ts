// Safe environment variable access function
const getClientId = () => {
  try {
    // Check for Vite's import.meta.env
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SPOTIFY_CLIENT_ID) {
      return (import.meta as any).env.VITE_SPOTIFY_CLIENT_ID;
    }
  } catch {}
  
  try {
    // Check for standard process.env
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SPOTIFY_CLIENT_ID) {
      return process.env.VITE_SPOTIFY_CLIENT_ID;
    }
  } catch {}
  
  return '';
};

const CLIENT_ID = getClientId();

// Dynamic Redirect URI: domain.com/redirect/spotify/
const REDIRECT_URI = `${window.location.origin}/redirect/spotify/`;

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";
const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "streaming", 
  "user-read-email", 
  "user-read-private"
];

export const getSpotifyLoginUrl = () => {
  if (!CLIENT_ID) {
    console.warn("Spotify Client ID not found. Please set VITE_SPOTIFY_CLIENT_ID in your .env file.");
    return '#';
  }
  return `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(SCOPES.join(" "))}`;
};

export const getTokenFromUrl = (): string | null => {
  const hash = window.location.hash;
  if (!hash) return null;

  const token = hash
    .substring(1)
    .split("&")
    .find((elem) => elem.startsWith("access_token"))
    ?.split("=")[1];

  return token || null;
};

export const cleanUrl = () => {
  window.location.hash = "";
  // Limpa a URL visualmente voltando para a raiz, para não ficar em /redirect/spotify/
  if (window.location.pathname.includes('/redirect/spotify')) {
    window.history.replaceState({}, document.title, window.location.origin);
  }
};