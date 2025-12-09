import { GoogleGenAI, Type, Modality } from "@google/genai";
import { blobToBase64 } from "../utils/audioUtils";
import { AnalyzerResponse } from "../types";

// Ensure we get a fresh instance, potentially after user selects a key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkApiKey = async () => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

export const analyzeAudioPersonality = async (audioBlob: Blob): Promise<AnalyzerResponse> => {
  const ai = getAI();
  const base64Audio = await blobToBase64(audioBlob);

  const systemInstruction = `
    You are MetaVibe, a synesthetic AI engine.
    Analyze the speaker's voice, tone, pace, and language to construct a deep personality profile.
    
    Output strictly valid JSON adhering to this schema:
    {
      "personality": {
        "traits": ["string"],
        "energy": number (1-10),
        "mood": "string",
        "colors": { "primary": "hex", "secondary": "hex", "accent": "hex" }
      },
      "music": {
        "genre": "string",
        "bpm": number,
        "instruments": ["string"],
        "vibe": "string"
      },
      "art": {
        "prompt": "string (highly descriptive for image gen)",
        "style": "string"
      },
      "story": {
        "narrative": "string (2-3 sentences max, strictly related to the user's vibe, referring to 'You')"
      },
      "video": {
        "prompt": "string (cinematic prompt for video gen)"
      },
      "tts": {
        "voice_name": "string (choose from: Puck, Charon, Kore, Fenrir, Zephyr)",
        "speaking_rate": number (0.8 to 1.3),
        "pitch": "string (low, medium, high)"
      }
    }
    
    If the user sounds shy: use soft colors, low BPM, lofi/ambient music, calm voice.
    If the user sounds energetic: use neon colors, high BPM, EDM/Rock, fast voice.
    Be creative with the art prompt (e.g., 'A cyberpunk samurai in a neon rain' for energetic, 'A watercolor cottage in a misty forest' for shy).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
        { text: "Analyze this audio and generate the MetaVibe profile." }
      ]
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json"
    }
  });

  if (!response.text) throw new Error("No analysis generated");
  return JSON.parse(response.text) as AnalyzerResponse;
};

export const generateArt = async (prompt: string): Promise<string> => {
  const ai = getAI();
  // Using gemini-3-pro-image-preview for high quality as requested
  // However, for speed and reliability in this demo context, we can check.
  // The user prompt asked for "High-Quality Image Generation... gemini-3-pro-image-preview"
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
            }
        }
      });
      
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part && part.inlineData) {
        return part.inlineData.data;
      }
      throw new Error("No image data found in response");
  } catch (e) {
      console.warn("High quality image failed, falling back to flash-image", e);
       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
             imageConfig: {
                aspectRatio: "1:1"
            }
        }
      });
       const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part && part.inlineData) {
        return part.inlineData.data;
      }
      throw new Error("Image generation failed");
  }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
        },
      },
    },
  });

  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("TTS generation failed");
  return base64;
};

export const generateVideo = async (prompt: string): Promise<string | null> => {
  const runGen = async () => {
    // Always get a fresh instance to pick up potential API_KEY changes
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll until done
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
        // We must append the API key
        return `${videoUri}&key=${process.env.API_KEY}`;
    }
    return null;
  };

  try {
    return await runGen();
  } catch (e: any) {
    console.error("Video generation initial attempt failed", e);
    
    // Check for 404 / Requested entity not found which implies API Key permission issues for Veo
    const isNotFound = e.message?.includes("Requested entity was not found") || 
                       JSON.stringify(e).includes("Requested entity was not found") ||
                       e.status === "NOT_FOUND" || 
                       e.code === 404;

    if (isNotFound) {
      console.log("Detecting missing/invalid Veo permission. Prompting for Key selection...");
      if (window.aistudio && window.aistudio.openSelectKey) {
        try {
          await window.aistudio.openSelectKey();
          // Retry once with new key
          return await runGen();
        } catch (retryError) {
          console.error("Retry failed after key selection", retryError);
          return null;
        }
      }
    }
    return null;
  }
};