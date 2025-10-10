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
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isInTrimMode, setIsInTrimMode] = useState(false);
  // Local state for trim preview during dragging
  const [localTrimStart, setLocalTrimStart] = useState<number | null>(null);
  const [localTrimEnd, setLocalTrimEnd] = useState<number | null>(null);
  const [localStartTime, setLocalStartTime] = useState<number | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef<number>(0);
  
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

  // Use local state during drag for smooth visual feedback, otherwise use track values
  const startTime = localStartTime !== null ? localStartTime : (track.startTime || 0);
  const trimStart = localTrimStart !== null ? localTrimStart : (track.trimStart || 0);
  const trimEnd = localTrimEnd !== null ? localTrimEnd : (track.trimEnd || track.duration);
  const displayDuration = trimEnd - trimStart;
  
  const startPosition = timeToPixels(startTime);
  const blockWidth = timeToPixels(displayDuration);

  // Handle touch gestures for iPhone-optimized interaction
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent iOS selection UI
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;
    
    // Double-tap detection for trim mode
    if (timeSinceLastTap < 300) {
      setIsInTrimMode(!isInTrimMode);
      setShowSnapIndicator(true);
      setTimeout(() => setShowSnapIndicator(false), 1000);
      return;
    }
    
    lastTapTime.current = now;
    
    // Start long-press timer for moving mode
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      // Trigger synthetic drag after long press
      if (blockRef.current) {
        const touch = e.touches[0];
        const rect = blockRef.current.getBoundingClientRect();
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: touch.clientX,
          clientY: touch.clientY,
          currentTarget: blockRef.current,
          target: blockRef.current
        } as any;
        handleMouseDown(syntheticEvent, 'drag');
      }
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();

    // Guard against null currentTarget
    if (!e.currentTarget) return;

    // Get the timeline container to calculate proper coordinates
    const timelineElement = e.currentTarget.closest('[data-timeline]') || 
                           document.querySelector('[data-timeline]');
    
    const timelineRect = timelineElement?.getBoundingClientRect();
    
    // Calculate initial position relative to the timeline, accounting for scroll
    const startX = e.clientX - (timelineRect?.left || 0) + scrollOffset;
    
    const initialStartTime = track.startTime || 0;
    const initialTrimStart = track.trimStart || 0;
    const initialTrimEnd = track.trimEnd || track.duration;

    if (action === 'drag') {
      // Prevent dragging in trim mode
      if (isInTrimMode) {
        return;
      }
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
        
        // Update local state for immediate visual feedback
        setLocalStartTime(newStartTime);
      } else if (action === 'resize-start') {
        // Trimming from the start: adjust both trimStart and startTime
        const newTrimStart = Math.max(0, Math.min(initialTrimStart + deltaTime, initialTrimEnd - 0.1));
        const trimDelta = newTrimStart - initialTrimStart;
        setLocalTrimStart(newTrimStart);
        setLocalStartTime(initialStartTime + trimDelta); // Move block as we trim from start
        setShowSnapIndicator(true);
      } else if (action === 'resize-end') {
        // Trimming from the end: only adjust trimEnd
        const newTrimEnd = Math.max(initialTrimStart + 0.1, Math.min(initialTrimEnd + deltaTime, track.duration));
        setLocalTrimEnd(newTrimEnd);
        setShowSnapIndicator(true);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setShowSnapIndicator(false);
      setIsLongPressing(false);
      
      // Apply final updates to track on mouseup - this prevents constant playback restarts
      if (action === 'drag' && localStartTime !== null) {
        console.log('🎯 Applying final startTime update:', localStartTime);
        onTrackUpdate(track.id, { startTime: localStartTime });
        setLocalStartTime(null);
      } else if (action === 'resize-start' && localTrimStart !== null && localStartTime !== null) {
        console.log('✂️ Applying final trimStart + startTime update:', { trimStart: localTrimStart, startTime: localStartTime });
        onTrackUpdate(track.id, { 
          trimStart: localTrimStart,
          startTime: localStartTime 
        });
        setLocalTrimStart(null);
        setLocalStartTime(null);
      } else if (action === 'resize-end' && localTrimEnd !== null) {
        console.log('✂️ Applying final trimEnd update:', localTrimEnd);
        onTrackUpdate(track.id, { trimEnd: localTrimEnd });
        setLocalTrimEnd(null);
      }
      
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
      className={`absolute h-16 bg-primary/80 rounded border-2 overflow-hidden group transition-all duration-200 select-none ${
        isDragging ? 'shadow-glow scale-105' : ''
      } ${track.isMuted ? 'opacity-50' : ''} ${
        showSnapIndicator ? 'ring-2 ring-accent ring-opacity-50' : ''
      } ${isInTrimMode ? 'border-accent border-4 shadow-accent' : 'border-primary/50'}
      ${isLongPressing ? 'border-green-500 border-4 shadow-green-500/50' : ''}
      ${isLongPressing || isInTrimMode ? 'cursor-grab' : 'cursor-move'}`}
      style={{
        left: `${startPosition}px`,
        width: `${Math.max(blockWidth, 20)}px`, // Minimum width for visibility
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none'
      }}
      onMouseDown={(e) => !isInTrimMode ? handleMouseDown(e, 'drag') : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

        {/* Enhanced trim handles - larger and more visible in trim mode */}
        <div
          className={`absolute left-0 top-0 cursor-ew-resize flex items-center justify-center touch-manipulation transition-all duration-200 select-none ${
            isInTrimMode ? 'w-12 h-full bg-accent opacity-100 border-r-2 border-accent-foreground' : 'w-6 h-full bg-accent opacity-70 group-hover:opacity-100'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'resize-start')}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
              clientX: touch.clientX,
              clientY: touch.clientY,
              currentTarget: e.currentTarget,
              target: e.currentTarget
            } as any;
            handleMouseDown(mouseEvent, 'resize-start');
          }}
          style={{ 
            pointerEvents: 'auto',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'none'
          }}
        >
          <div className={`bg-accent-foreground rounded-full transition-all ${
            isInTrimMode ? 'w-2 h-12' : 'w-1 h-8'
          }`} />
          {isInTrimMode && (
            <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 text-xs bg-accent text-accent-foreground px-1 py-0.5 rounded whitespace-nowrap">
              TRIM
            </div>
          )}
        </div>
        
        <div
          className={`absolute right-0 top-0 cursor-ew-resize flex items-center justify-center touch-manipulation transition-all duration-200 select-none ${
            isInTrimMode ? 'w-12 h-full bg-accent opacity-100 border-l-2 border-accent-foreground' : 'w-6 h-full bg-accent opacity-70 group-hover:opacity-100'
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'resize-end')}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
              clientX: touch.clientX,
              clientY: touch.clientY,
              currentTarget: e.currentTarget,
              target: e.currentTarget
            } as any;
            handleMouseDown(mouseEvent, 'resize-end');
          }}
          style={{ 
            pointerEvents: 'auto',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'none'
          }}
        >
          <div className={`bg-accent-foreground rounded-full transition-all ${
            isInTrimMode ? 'w-2 h-12' : 'w-1 h-8'
          }`} />
          {isInTrimMode && (
            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-xs bg-accent text-accent-foreground px-1 py-0.5 rounded whitespace-nowrap">
              TRIM
            </div>
          )}
        </div>
      </div>

      {/* Status indicators */}
      {isResizing && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
          {isResizing === 'start' ? `Start: ${trimStart.toFixed(1)}s` : `End: ${trimEnd.toFixed(1)}s`}
        </div>
      )}
      
      {isLongPressing && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          MOVE MODE - Drag to reposition
        </div>
      )}
      
      {isInTrimMode && !isResizing && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
          TRIM MODE - Double-tap to exit
        </div>
      )}
    </div>
  );
}