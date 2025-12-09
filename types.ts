export interface PersonalityVector {
  traits: string[];
  energy: number; // 1-10
  mood: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface GeneratedAssets {
  artPrompt: string;
  artBase64: string | null;
  storyText: string;
  musicDescription: {
    genre: string;
    bpm: number;
    instruments: string[];
    vibe: string;
  };
  videoUri: string | null;
  audioBase64: string | null; // TTS
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  GENERATING_ASSETS = 'GENERATING_ASSETS',
  SHOWCASE = 'SHOWCASE',
  ERROR = 'ERROR'
}

export type AnalyzerResponse = {
  personality: PersonalityVector;
  music: {
    genre: string;
    bpm: number;
    instruments: string[];
    vibe: string;
  };
  art: {
    prompt: string;
    style: string;
  };
  story: {
    narrative: string;
  };
  video: {
    prompt: string;
  };
  tts: {
    voice_name: string;
    speaking_rate: number; // 0.5 to 2.0
    pitch: string;
  };
};