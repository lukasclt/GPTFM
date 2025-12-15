import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RadioContent, Track } from "../types";

// Tenta pegar a chave de várias fontes possíveis
const getApiKey = () => {
  try {
    // Vite env variables (preferred)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      if ((import.meta as any).env.VITE_API_KEY) return (import.meta as any).env.VITE_API_KEY;
      if ((import.meta as any).env.API_KEY) return (import.meta as any).env.API_KEY;
    }
    // Process env fallback
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {}
  return '';
};

const apiKey = getApiKey();
// Só instancia o Gemini se tiver chave, senão o app roda em modo Demo
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- MOCK DATA GENERATORS (Para quando não houver API) ---

const MOCK_TRACKS: Record<string, Track[]> = {
  default: [
    { artist: "Lo-Fi Dreamer", title: "Midnight Code", genre: "Lo-Fi", reason: "Batidas calmas para focar." },
    { artist: "Chill Hopper", title: "Coffee Break", genre: "Chill", reason: "Vibe relaxante de cafeteria." },
    { artist: "Synthwave Boy", title: "Neon Highway", genre: "Synthwave", reason: "Energia retro futurista." },
    { artist: "Jazz Cat", title: "Smooth Operator", genre: "Jazz", reason: "Clássico suave." },
    { artist: "Ambient Soul", title: "Deep Space", genre: "Ambient", reason: "Para viajar nas ideias." }
  ],
  rock: [
    { artist: "Led Zeppelin", title: "Immigrant Song", genre: "Classic Rock", reason: "Energia pura para começar." },
    { artist: "Nirvana", title: "Come As You Are", genre: "Grunge", reason: "Um clássico atemporal." },
    { artist: "Arctic Monkeys", title: "Do I Wanna Know?", genre: "Indie Rock", reason: "Batida marcante e moderna." },
    { artist: "Queen", title: "Don't Stop Me Now", genre: "Rock", reason: "Para elevar o astral." },
    { artist: "The Strokes", title: "Last Nite", genre: "Indie", reason: "Vibe de garagem nostálgica." }
  ]
};

const getMockStation = (prompt: string): any => {
  const isRock = prompt.toLowerCase().includes('rock');
  const playlist = isRock ? MOCK_TRACKS.rock : MOCK_TRACKS.default;
  
  return {
    stationName: isRock ? "Rock Legends FM" : "GPT Demo FM",
    djIntro: `Olá! Você está sintonizado na rádio de demonstração. Como não detectamos uma chave de API, estou simulando essa transmissão baseada no seu pedido: "${prompt}". Aproveite a música!`,
    playlist: playlist
  };
};

// --- SERVICES ---

export const generateRadioStation = async (userPrompt: string, user: { id: string, name: string }, isPublic: boolean): Promise<RadioContent> => {
  // SIMULATION MODE
  if (!ai) {
    console.warn("API Key not found. Running in Demo Mode.");
    await delay(2000); // Fake loading
    const mockData = getMockStation(userPrompt);
    return {
      ...mockData,
      id: crypto.randomUUID(),
      ownerId: user.id,
      ownerName: user.name,
      isPublic,
      vibe: userPrompt,
      likes: 0,
      listeners: 1
    } as RadioContent;
  }

  // REAL AI MODE
  try {
    const model = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model,
      contents: `Create a radio station experience based on this vibe: "${userPrompt}".
      I need a creative station name, a short, charismatic DJ intro (max 3 sentences) welcoming listeners, and a list of 5 songs that fit perfectly.
      For each song, briefly explain why it fits the vibe in the 'reason' field.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stationName: { type: Type.STRING },
            djIntro: { type: Type.STRING, description: "Charismatic DJ speech text" },
            playlist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  artist: { type: Type.STRING },
                  title: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["artist", "title", "genre", "reason"]
              }
            }
          },
          required: ["stationName", "djIntro", "playlist"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        ...data,
        id: crypto.randomUUID(),
        ownerId: user.id,
        ownerName: user.name,
        isPublic,
        vibe: userPrompt,
        likes: 0,
        listeners: 1
      } as RadioContent;
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Error generating radio content:", error);
    // Fallback to mock on error
    return generateRadioStation(userPrompt, user, isPublic);
  }
};

export const generateAdScript = async (stationName: string): Promise<string> => {
  if (!ai) {
    await delay(1000);
    return `Você está ouvindo a ${stationName}. Esta é uma mensagem de teste do modo de demonstração.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write a short, funny, 15-second radio commercial script for a fictional product. 
      End the script with "You're listening to ${stationName}".`,
      config: {
        maxOutputTokens: 100,
      }
    });
    return response.text || "You are listening to GPT FM. Stay tuned.";
  } catch (e) {
    return `This is ${stationName}, don't go anywhere.`;
  }
};

export const evaluateSongRequest = async (songQuery: string, currentVibe: string): Promise<Track | null> => {
  if (!ai) {
    await delay(1000);
    return {
      artist: "Demo Artist",
      title: songQuery,
      genre: "Demo Genre",
      reason: "No modo demo, todos os pedidos são aceitos!"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `A listener requested "${songQuery}" for a radio station with the vibe "${currentVibe}".
      If the song fits reasonably well, return the track details. If it's a terrible fit, return null.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            track: {
              type: Type.OBJECT,
              properties: {
                artist: { type: Type.STRING },
                title: { type: Type.STRING },
                genre: { type: Type.STRING },
                reason: { type: Type.STRING, description: "Why this request was accepted" },
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      if (result.isValid && result.track) {
        return result.track as Track;
      }
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Tiny Silent WAV file in Base64 to prevent player crash when no API is present
const SILENT_WAV_BASE64 = "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

export const generateDJVoice = async (text: string): Promise<ArrayBuffer> => {
  if (!ai) {
    console.warn("TTS skipped (Demo Mode). Returning silent buffer.");
    await delay(500); // Simulate processing
    
    // Convert base64 silent wav to buffer
    const binaryString = atob(SILENT_WAV_BASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned");
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Error generating DJ voice:", error);
    // Return silent buffer on error to not crash player
    const binaryString = atob(SILENT_WAV_BASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
};