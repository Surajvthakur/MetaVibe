import React, { useEffect, useRef, useState } from 'react';
import { GeneratedAssets, PersonalityVector } from '../types';
import { Play, Pause, Music, Volume2, User, Palette } from 'lucide-react';

interface VibeCardProps {
  assets: GeneratedAssets;
  personality: PersonalityVector;
}

const VibeCard: React.FC<VibeCardProps> = ({ assets, personality }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (assets.audioBase64 && audioRef.current) {
      audioRef.current.src = `data:audio/mp3;base64,${assets.audioBase64}`;
      // Auto-play the TTS response
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log("Autoplay prevented", e));
    }
  }, [assets.audioBase64]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 animate-fade-in">
      <div 
        className="glass-panel rounded-3xl overflow-hidden shadow-2xl transition-all duration-500"
        style={{ 
          borderColor: personality.colors.secondary,
          boxShadow: `0 0 40px ${personality.colors.primary}40`
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          
          {/* Visual Side */}
          <div className="relative aspect-square md:aspect-auto min-h-[400px] bg-black overflow-hidden group">
            {showVideo && assets.videoUri && !videoError ? (
              <video 
                ref={videoRef}
                src={assets.videoUri}
                autoPlay 
                loop 
                muted 
                onError={(e) => {
                  console.error("Video playback error", e);
                  setVideoError(true);
                  setShowVideo(false);
                }}
                className="w-full h-full object-cover transition-opacity duration-1000 opacity-100"
              />
            ) : (
              assets.artBase64 && (
                <img 
                  src={`data:image/png;base64,${assets.artBase64}`} 
                  alt="AI Art" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )
            )}

            {/* Video Toggle Button (if video exists and works) */}
            {assets.videoUri && !videoError && (
              <button 
                onClick={() => setShowVideo(!showVideo)}
                className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 hover:bg-white/20 transition"
              >
                {showVideo ? 'Show Art' : 'Show Motion'}
              </button>
            )}

            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="flex items-center gap-2 mb-2">
                <Palette size={16} color={personality.colors.accent} />
                <span className="text-xs uppercase tracking-widest font-space text-gray-300">
                  Visual Style
                </span>
              </div>
              <p className="text-sm font-light text-white/90 line-clamp-2">
                {assets.artPrompt}
              </p>
            </div>
          </div>

          {/* Data Side */}
          <div className="p-8 flex flex-col justify-between relative bg-gradient-to-br from-black/80 to-gray-900/80">
            {/* Personality Header */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: personality.colors.primary }}
                >
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-space leading-tight">
                    {personality.mood} {personality.traits[0]}
                  </h2>
                  <div className="flex gap-2 mt-1">
                    {personality.traits.slice(1).map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Story */}
              <div className="mb-8">
                <p className="text-lg md:text-xl font-light leading-relaxed text-white/90 italic">
                  "{assets.storyText}"
                </p>
              </div>
            </div>

            {/* Audio/Music Section */}
            <div className="glass-panel p-4 rounded-2xl border-l-4" style={{ borderLeftColor: personality.colors.accent }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Music size={18} className="text-gray-400" />
                  <span className="font-space text-sm font-bold tracking-wider text-gray-200">
                    {assets.musicDescription.genre.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {assets.musicDescription.bpm} BPM
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mb-4">
                {assets.musicDescription.vibe} • {assets.musicDescription.instruments.join(', ')}
              </p>

              <div className="flex items-center gap-3">
                 <button 
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
                </button>
                <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isPlaying ? 'animate-pulse' : ''}`} 
                    style={{ width: isPlaying ? '100%' : '0%', background: personality.colors.primary, transition: 'width 2s ease' }}
                  ></div>
                </div>
                <Volume2 size={16} className="text-gray-500" />
              </div>
              <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibeCard;