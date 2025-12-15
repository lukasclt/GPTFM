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
const REDIRECT_URI = `${window.location.origin}/`;

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";
const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "streaming", 
  "user-read-email", 
  "user-read-private",
  "user-modify-playback-state"
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
  if (window.location.pathname.includes('/redirect/spotify')) {
    window.history.replaceState({}, document.title, window.location.origin);
  }
};

// --- API Calls ---

export const searchSpotifyTrack = async (token: string, artist: string, title: string) => {
  if (!token) return null;
  try {
    const query = encodeURIComponent(`track:${title} artist:${artist}`);
    const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.tracks && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      return {
        uri: track.uri,
        imageUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms
      };
    }
  } catch (e) {
    console.error("Spotify Search Error", e);
  }
  return null;
};

export const playSpotifyTrack = async (token: string, deviceId: string, trackUri: string) => {
  if (!token || !deviceId || !trackUri) return;
  try {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
  } catch (e) {
    console.error("Spotify Play Error", e);
  }
};

export const pauseSpotify = async (token: string) => {
  if (!token) return;
  try {
    await fetch(`https://api.spotify.com/v1/me/player/pause`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) { console.error("Pause Error", e); }
};
