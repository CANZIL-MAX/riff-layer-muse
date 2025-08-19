import { useState, useRef, useEffect } from 'react';
import { AudioTrack } from '@/services/ProjectManager';
import { WaveformDisplay } from './WaveformDisplay';
import { useSnapToGrid } from '@/hooks/useSnapToGrid';

interface WaveformBlockProps {
  track: AudioTrack;
  timeToPixels: (time: number) => number;
  pixelsToTime: (pixels: number) => number;
  timelineWidth: number;
  onTrackUpdate: (trackId: string, updates: Partial<AudioTrack>) => void;
  isPlaying: boolean;
  currentTime: number;
  bpm?: number;
  snapToGrid?: boolean;
  scrollOffset?: number;
  zoomLevel?: number;
  isRecording?: boolean;
  showProgressOverlay?: boolean;
}

export function WaveformBlock({
  track,
  timeToPixels,
  pixelsToTime,
  timelineWidth,
  onTrackUpdate,
  isPlaying,
  currentTime,
  bpm = 120,
  snapToGrid = true,
  scrollOffset = 0,
  zoomLevel = 1,
  isRecording = false,
  showProgressOverlay = true,
}: WaveformBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'start' | 'end' | false>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [showSnapIndicator, setShowSnapIndicator] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const { snapToGrid: snapToGridFn } = useSnapToGrid({ bpm, snapEnabled: snapToGrid, zoomLevel });

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
          
          // Use a more robust approach to extract base64 data
          let cleanBase64 = track.audioData;
          if (track.audioData.includes(',')) {
            cleanBase64 = track.audioData.split(',')[1];
          }
          
          const binaryString = atob(cleanBase64);
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
  
  const startPosition = timeToPixels(startTime);
  const blockWidth = timeToPixels(displayDuration);

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();

    // Get the timeline container to calculate proper coordinates
    const timelineElement = e.currentTarget.closest('[data-timeline]') || 
                           document.querySelector('[data-timeline]');
    
    const timelineRect = timelineElement?.getBoundingClientRect();
    
    // Calculate initial position relative to the timeline, accounting for scroll
    const startX = e.clientX - (timelineRect?.left || 0) + scrollOffset;
    
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
      // Calculate current mouse position relative to timeline, accounting for scroll
      const currentX = e.clientX - (timelineRect?.left || 0) + scrollOffset;
      const deltaX = currentX - startX;
      const deltaTime = pixelsToTime(deltaX);

      if (action === 'drag') {
        let newStartTime = Math.max(0, initialStartTime + deltaTime);
        
        // Apply snap to grid if enabled
        if (snapToGrid) {
          const snappedTime = snapToGridFn(newStartTime);
          newStartTime = snappedTime;
          setShowSnapIndicator(true);
        } else {
          setShowSnapIndicator(false);
        }
        
        onTrackUpdate(track.id, { startTime: newStartTime });
      } else if (action === 'resize-start') {
        // Fixed trimming: trim start without moving the rest
        const newTrimStart = Math.max(0, Math.min(initialTrimStart + deltaTime, initialTrimEnd - 0.1));
        onTrackUpdate(track.id, { trimStart: newTrimStart });
      } else if (action === 'resize-end') {
        // Fixed trimming: trim end without moving the rest
        const newTrimEnd = Math.max(initialTrimStart + 0.1, Math.min(initialTrimEnd + deltaTime, track.duration));
        onTrackUpdate(track.id, { trimEnd: newTrimEnd });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setShowSnapIndicator(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
      });
      handleMouseMove(mouseEvent);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  };

  return (
    <div
      ref={blockRef}
      className={`absolute h-16 bg-primary/80 rounded border-2 border-primary/50 overflow-hidden cursor-move group transition-all duration-200 ${
        isDragging ? 'shadow-glow scale-105' : ''
      } ${track.isMuted ? 'opacity-50' : ''} ${
        showSnapIndicator ? 'ring-2 ring-accent ring-opacity-50' : ''
      }`}
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
            width={blockWidth}
            height={64}
            trimStart={trimStart}
            trimEnd={trimEnd}
            zoomLevel={zoomLevel}
            showProgressOverlay={showProgressOverlay}
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

        {/* Enhanced trim handles for touch */}
        <div
          className="absolute left-0 top-0 w-6 h-full bg-accent cursor-ew-resize opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center touch-manipulation"
          onMouseDown={(e) => handleMouseDown(e, 'resize-start')}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              bubbles: true
            });
            handleMouseDown(mouseEvent as any, 'resize-start');
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-1 h-8 bg-accent-foreground rounded-full" />
        </div>
        
        <div
          className="absolute right-0 top-0 w-6 h-full bg-accent cursor-ew-resize opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center touch-manipulation"
          onMouseDown={(e) => handleMouseDown(e, 'resize-end')}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              bubbles: true
            });
            handleMouseDown(mouseEvent as any, 'resize-end');
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-1 h-8 bg-accent-foreground rounded-full" />
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