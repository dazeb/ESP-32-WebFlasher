
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

// Helper to ensure we have an API key or let the UI handle it (but here we assume env)
// Realistically in a "Select Key" flow, we might need to recreate this.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Use gemini-3-flash-preview for basic text tasks as per updated guidelines
export const generateFirmwareAdvice = async (
  query: string,
  history: ChatMessage[] = []
): Promise<{ text: string; groundingChunks?: any[] }> => {
  const ai = getAI();
  
  // Using gemini-3-flash-preview with googleSearch for up-to-date info on firmwares
  const model = 'gemini-3-flash-preview';
  
  // Construct a simple history string or just send the query if chat interface is simple
  // For this implementation, we'll just send the current query with a system instruction context
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: query,
      config: {
        systemInstruction: "You are an expert embedded systems engineer and security researcher. You help users understand ESP32 firmwares, flashing processes, and hardware compatibility. You use Google Search to find the latest versions and documentation for tools like Marauder, Meshtastic, etc.",
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || "I couldn't generate a response.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return { text: "Error connecting to AI assistant." };
  }
};

// Use gemini-3-pro-image-preview for high-quality image generation
export const generateBootLogo = async (
  prompt: string,
  size: '1K' | '2K' | '4K'
): Promise<string> => {
  // Check for client-side API key selection for Veo/Pro Image models
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          throw new Error("API_KEY_MISSING");
      }
  }

  // We must re-instantiate with the (potentially new) key from the environment
  const ai = getAI();

  // Using gemini-3-pro-image-preview for high quality images
  const model = 'gemini-3-pro-image-preview';

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: "1:1" // Boot logos are usually square or 4:3, sticking to 1:1 for safety
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      // Find the image part in the response
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};
