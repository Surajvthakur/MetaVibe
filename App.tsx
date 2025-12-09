import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { analyzeAudioPersonality, checkApiKey, generateArt, generateSpeech, generateVideo } from './services/geminiService';
import { AppState, AnalyzerResponse, GeneratedAssets, PersonalityVector } from './types';
import Visualizer from './components/Visualizer';
import VibeCard from './components/VibeCard';
import { blobToBase64 } from './utils/audioUtils';

// Default personality for initial state visual
const DEFAULT_COLOR = "#3b82f6";

function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [personality, setPersonality] = useState<PersonalityVector | null>(null);
  const [assets, setAssets] = useState<GeneratedAssets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready to vibe");

  // Ref to hold chunks
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      await checkApiKey();
      
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      
      const recorder = new MediaRecorder(audioStream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = handleRecordingStop;
      
      recorder.start();
      setMediaRecorder(recorder);
      setState(AppState.RECORDING);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or API Key missing. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setState(AppState.ANALYZING);
    }
  };

  const handleRecordingStop = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // 1. Analyze
      setStatusMessage("Extracting personality vector...");
      const analysis: AnalyzerResponse = await analyzeAudioPersonality(blob);
      setPersonality(analysis.personality);
      
      // 2. Generate Assets in Parallel
      setState(AppState.GENERATING_ASSETS);
      setStatusMessage("Generating multimodal experience...");

      // Start Art & TTS generation first as they are faster
      const artPromise = generateArt(analysis.art.prompt);
      const ttsPromise = generateSpeech(analysis.story.narrative, analysis.tts.voice_name);
      
      // Wait for Art & TTS
      const [artBase64, audioBase64] = await Promise.all([artPromise, ttsPromise]);
      
      // Initial Asset State without video
      const initialAssets: GeneratedAssets = {
        artPrompt: analysis.art.prompt,
        artBase64,
        storyText: analysis.story.narrative,
        musicDescription: analysis.music,
        videoUri: null,
        audioBase64
      };
      
      setAssets(initialAssets);
      setState(AppState.SHOWCASE);

      // 3. Generate Video in background (slower)
      // Only trigger if we are successfully showing the rest
      generateVideo(analysis.video.prompt).then(uri => {
          if (uri) {
              setAssets(prev => prev ? { ...prev, videoUri: uri } : null);
          }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during generation.");
      setState(AppState.ERROR);
    }
  };

  const reset = () => {
    setState(AppState.IDLE);
    setPersonality(null);
    setAssets(null);
    setError(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-[-1] transition-colors duration-1000"
        style={{ 
          background: personality 
            ? `radial-gradient(circle at center, ${personality.colors.primary}20 0%, #000 70%)` 
            : 'radial-gradient(circle at center, #111 0%, #000 80%)' 
        }}
      />
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-500 animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tighter font-space">MetaVibe</h1>
        </div>
        {state === AppState.SHOWCASE && (
          <button onClick={reset} className="text-sm font-mono text-gray-400 hover:text-white transition">
            RESET_EXPERIENCE
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl z-10 flex flex-col items-center">
        
        {/* Error State */}
        {state === AppState.ERROR && (
          <div className="glass-panel p-6 rounded-xl border-red-500/50 mb-8 max-w-md text-center">
            <AlertCircle className="mx-auto mb-4 text-red-400" size={32} />
            <h3 className="text-lg font-bold text-red-200 mb-2">System Failure</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button 
              onClick={reset}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-6 py-2 rounded-full transition"
            >
              Reboot System
            </button>
          </div>
        )}

        {/* Idle / Recording State */}
        {(state === AppState.IDLE || state === AppState.RECORDING) && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl md:text-6xl font-black font-space bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                SPEAK YOUR VIBE
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                MetaVibe listens to your voice and generates a unique audiovisual reality based on your personality.
              </p>
            </div>

            <div className="relative group">
              <div className={`absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition duration-500 ${state === AppState.RECORDING ? 'animate-pulse' : ''}`}></div>
              <button
                onClick={state === AppState.IDLE ? startRecording : stopRecording}
                className={`
                  relative w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${state === AppState.RECORDING 
                    ? 'bg-red-500/10 border-red-500 text-red-500 scale-110' 
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/50 hover:scale-105'}
                `}
              >
                {state === AppState.RECORDING ? (
                  <Square size={32} fill="currentColor" />
                ) : (
                  <Mic size={32} />
                )}
              </button>
            </div>

            {/* Visualizer */}
            <div className="h-32 w-full flex items-center justify-center">
              {state === AppState.RECORDING && stream ? (
                <Visualizer stream={stream} isRecording={true} color="#ef4444" />
              ) : (
                <div className="text-xs font-mono text-gray-600">WAITING FOR INPUT...</div>
              )}
            </div>
          </div>
        )}

        {/* Analysis / Generation State */}
        {(state === AppState.ANALYZING || state === AppState.GENERATING_ASSETS) && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
             <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 size={64} className="text-purple-400 animate-spin relative z-10" />
             </div>
             <div className="text-center">
               <h3 className="text-2xl font-bold font-space text-white">{statusMessage}</h3>
               <p className="text-sm font-mono text-purple-300/60 mt-2">
                 {state === AppState.ANALYZING ? "DECODING AUDIO SIGNALS..." : "SYNTHESIZING REALITY..."}
               </p>
             </div>
             
             {/* Progress Bar Simulation */}
             <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-[width_3s_ease-in-out_infinite]" style={{width: '100%'}}></div>
             </div>
          </div>
        )}

        {/* Showcase State */}
        {state === AppState.SHOWCASE && assets && personality && (
          <VibeCard assets={assets} personality={personality} />
        )}

      </main>

      <footer className="absolute bottom-4 text-xs text-gray-700 font-mono">
        POWERED BY GEMINI 2.5 • VEO • IMAGEN
      </footer>
    </div>
  );
}

export default App;