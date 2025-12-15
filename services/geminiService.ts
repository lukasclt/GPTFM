import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RadioContent } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates the station name, DJ intro script, and a playlist based on user prompt.
 */
export const generateRadioStation = async (userPrompt: string): Promise<RadioContent> => {
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
      return JSON.parse(response.text) as RadioContent;
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Error generating radio content:", error);
    throw error;
  }
};

/**
 * Converts text to speech using Gemini TTS model to simulate the DJ.
 */
export const generateDJVoice = async (text: string): Promise<ArrayBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep, radio-like voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned");
    }

    // Decode Base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Error generating DJ voice:", error);
    throw error;
  }
};