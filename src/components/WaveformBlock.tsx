import { useState, useRef, useEffect } from 'react';
import { AudioTrack } from '@/services/ProjectManager';
import { WaveformDisplay } from './WaveformDisplay';

interface WaveformBlockProps {
  track: AudioTrack;
  timeToPixels: (time: number, width: number) => number;
  pixelsToTime: (pixels: number, width: number) => number;
  timelineWidth: number;
  onTrackUpdate: (trackId: string, updates: Partial<AudioTrack>) => void;
  isPlaying: boolean;
  currentTime: number;
}

export function WaveformBlock({
  track,
  timeToPixels,
  pixelsToTime,
  timelineWidth,
  onTrackUpdate,
  isPlaying,
  currentTime,
}: WaveformBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'start' | 'end' | false>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loadAudioBuffer = async () => {
      if (track.audioData && !audioBuffer) {
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          // Extract base64 from data URL
          const base64Data = track.audioData.split(',')[1] || track.audioData;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const buffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
          setAudioBuffer(buffer);
        } catch (error) {
          console.error('Error loading audio buffer for waveform block:', error);
        }
      }
    };

    loadAudioBuffer();
  }, [track.audioData, audioBuffer]);

  const startTime = track.startTime || 0;
  const trimStart = track.trimStart || 0;
  const trimEnd = track.trimEnd || track.duration;
  const displayDuration = trimEnd - trimStart;
  
  const startPosition = timeToPixels(startTime, timelineWidth);
  const blockWidth = timeToPixels(displayDuration, timelineWidth);

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialStartTime = startTime;
    const initialTrimStart = trimStart;
    const initialTrimEnd = trimEnd;

    if (action === 'drag') {
      setIsDragging(true);
    } else if (action === 'resize-start') {
      setIsResizing('start');
    } else if (action === 'resize-end') {
      setIsResizing('end');
    }

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaTime = pixelsToTime(deltaX, timelineWidth);

      if (action === 'drag') {
        const newStartTime = Math.max(0, initialStartTime + deltaTime);
        onTrackUpdate(track.id, { startTime: newStartTime });
      } else if (action === 'resize-start') {
        const newTrimStart = Math.max(0, Math.min(initialTrimStart + deltaTime, initialTrimEnd - 0.1));
        onTrackUpdate(track.id, { trimStart: newTrimStart });
      } else if (action === 'resize-end') {
        const newTrimEnd = Math.max(initialTrimStart + 0.1, Math.min(initialTrimEnd + deltaTime, track.duration));
        onTrackUpdate(track.id, { trimEnd: newTrimEnd });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={blockRef}
      className={`absolute h-16 bg-primary/80 rounded border-2 border-primary/50 overflow-hidden cursor-move group transition-all duration-200 ${
        isDragging ? 'shadow-glow scale-105' : ''
      } ${track.isMuted ? 'opacity-50' : ''}`}
      style={{
        left: `${startPosition}px`,
        width: `${Math.max(blockWidth, 20)}px`, // Minimum width for visibility
      }}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
    >
      {/* Waveform content */}
      <div className="h-full relative">
        {audioBuffer ? (
          <WaveformDisplay
            audioBuffer={audioBuffer}
            isPlaying={isPlaying && !track.isMuted}
            isMuted={track.isMuted}
            currentTime={currentTime - startTime + trimStart}
            height={64}
            trimStart={trimStart}
            trimEnd={trimEnd}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-primary-foreground text-xs">
            Loading...
          </div>
        )}

        {/* Track name overlay */}
        <div className="absolute top-1 left-2 text-xs font-medium text-primary-foreground/90 pointer-events-none">
          {track.name}
        </div>

        {/* Trim handles */}
        <div
          className="absolute left-0 top-0 w-2 h-full bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'resize-start')}
        >
          <div className="w-0.5 h-8 bg-accent-foreground rounded-full" />
        </div>
        
        <div
          className="absolute right-0 top-0 w-2 h-full bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'resize-end')}
        >
          <div className="w-0.5 h-8 bg-accent-foreground rounded-full" />
        </div>
      </div>

      {/* Resize indicators */}
      {isResizing && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
          {isResizing === 'start' ? `Start: ${trimStart.toFixed(1)}s` : `End: ${trimEnd.toFixed(1)}s`}
        </div>
      )}
    </div>
  );
}