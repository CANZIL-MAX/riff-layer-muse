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
  const [isInTrimMode, setIsInTrimMode] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  // Local state for trim preview during dragging
  const [localTrimStart, setLocalTrimStart] = useState<number | null>(null);
  const [localTrimEnd, setLocalTrimEnd] = useState<number | null>(null);
  const [localStartTime, setLocalStartTime] = useState<number | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTapTime = useRef<number>(0);
  const selectionTimer = useRef<NodeJS.Timeout | null>(null);
  
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

  // Native iOS touch handling - simplified and direct
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;
    
    // Double-tap detection for trim mode toggle
    if (timeSinceLastTap < 300) {
      setIsInTrimMode(!isInTrimMode);
      setShowSnapIndicator(true);
      setTimeout(() => setShowSnapIndicator(false), 1000);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
      return;
    }
    
    lastTapTime.current = now;
    
    // Single tap - select the block
    setIsSelected(true);
    if (selectionTimer.current) {
      clearTimeout(selectionTimer.current);
    }
    selectionTimer.current = setTimeout(() => {
      setIsSelected(false);
    }, 5000);
  };

  // Direct touch drag handling for block repositioning
  const handleBlockDragStart = (e: React.TouchEvent) => {
    // Don't allow dragging in trim mode
    if (isInTrimMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const timelineRect = blockRef.current?.closest('[data-timeline]')?.getBoundingClientRect();
    const startX = touch.clientX - (timelineRect?.left || 0) + scrollOffset;
    const initialStartTime = track.startTime || 0;
    
    setIsDragging(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    const handleMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      const currentTouch = moveEvent.touches[0];
      const currentX = currentTouch.clientX - (timelineRect?.left || 0) + scrollOffset;
      const deltaX = currentX - startX;
      const deltaTime = pixelsToTime(deltaX);
      
      let newStartTime = Math.max(0, initialStartTime + deltaTime);
      
      if (snapToGrid) {
        newStartTime = snapToGridFn(newStartTime);
        setShowSnapIndicator(true);
      } else {
        setShowSnapIndicator(false);
      }
      
      setLocalStartTime(newStartTime);
    };
    
    const handleEnd = () => {
      if (localStartTime !== null) {
        console.log('🎯 Applying final startTime update:', localStartTime);
        onTrackUpdate(track.id, { startTime: localStartTime });
        setLocalStartTime(null);
      }
      setIsDragging(false);
      setShowSnapIndicator(false);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  // Nudge functions for precise timing adjustments
  const handleNudgeLeft = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const nudgeAmount = 0.050; // 50ms
    const newStartTime = Math.max(0, (track.startTime || 0) - nudgeAmount);
    onTrackUpdate(track.id, { startTime: newStartTime });
    console.log(`⬅️ Nudged ${track.name} left by 50ms, new startTime: ${newStartTime}`);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleNudgeRight = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const nudgeAmount = 0.050; // 50ms
    const newStartTime = (track.startTime || 0) + nudgeAmount;
    onTrackUpdate(track.id, { startTime: newStartTime });
    console.log(`➡️ Nudged ${track.name} right by 50ms, new startTime: ${newStartTime}`);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Native touch handlers for trim operations
  const handleTrimTouchStart = (e: React.TouchEvent, side: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const timelineRect = blockRef.current?.closest('[data-timeline]')?.getBoundingClientRect();
    const startX = touch.clientX - (timelineRect?.left || 0) + scrollOffset;
    
    setIsResizing(side);
    setShowSnapIndicator(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    const initialTrimStart = track.trimStart || 0;
    const initialTrimEnd = track.trimEnd || track.duration;
    const initialStartTime = track.startTime || 0;
    
    const handleMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      const currentTouch = moveEvent.touches[0];
      const currentX = currentTouch.clientX - (timelineRect?.left || 0) + scrollOffset;
      const deltaX = currentX - startX;
      const deltaTime = pixelsToTime(deltaX);
      
      if (side === 'start') {
        // Trimming from the start: adjust both trimStart and startTime
        const newTrimStart = Math.max(0, Math.min(initialTrimStart + deltaTime, initialTrimEnd - 0.1));
        const trimDelta = newTrimStart - initialTrimStart;
        setLocalTrimStart(newTrimStart);
        setLocalStartTime(initialStartTime + trimDelta);
      } else {
        // Trimming from the end: only adjust trimEnd
        const newTrimEnd = Math.max(initialTrimStart + 0.1, Math.min(initialTrimEnd + deltaTime, track.duration));
        setLocalTrimEnd(newTrimEnd);
      }
    };
    
    const handleEnd = () => {
      // Apply final updates
      if (side === 'start' && localTrimStart !== null && localStartTime !== null) {
        console.log('✂️ Applying final trimStart + startTime update:', { 
          trimStart: localTrimStart, 
          startTime: localStartTime 
        });
        onTrackUpdate(track.id, { 
          trimStart: localTrimStart,
          startTime: localStartTime 
        });
        setLocalTrimStart(null);
        setLocalStartTime(null);
      } else if (side === 'end' && localTrimEnd !== null) {
        console.log('✂️ Applying final trimEnd update:', localTrimEnd);
        onTrackUpdate(track.id, { trimEnd: localTrimEnd });
        setLocalTrimEnd(null);
      }
      
      setIsResizing(false);
      setShowSnapIndicator(false);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  return (
    <div
      ref={blockRef}
      data-waveform-block
      className={`absolute h-16 bg-primary/80 rounded border-2 overflow-hidden group transition-all duration-200 select-none ${
        isDragging ? 'shadow-glow scale-105' : ''
      } ${track.isMuted ? 'opacity-50' : ''} ${
        showSnapIndicator ? 'ring-2 ring-accent ring-opacity-50' : ''
      } ${isInTrimMode ? 'border-accent border-4 shadow-accent' : 'border-primary/50'}
      ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-80' : ''}
      ${isInTrimMode ? 'cursor-default' : 'cursor-move'}`}
      style={{
        left: `${startPosition}px`,
        width: `${Math.max(blockWidth, 20)}px`,
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none'
      }}
      onTouchStart={(e) => {
        handleTouchStart(e);
        // Only start drag if not in trim mode
        if (!isInTrimMode && e.touches.length === 1) {
          handleBlockDragStart(e);
        }
      }}
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

        {/* Nudge buttons - shown when selected */}
        {isSelected && !isDragging && !isResizing && (
          <div className="absolute top-1 right-2 flex gap-1 z-10">
            <button
              onTouchEnd={handleNudgeLeft}
              className="bg-blue-500 active:bg-blue-700 text-white text-xs font-bold px-2 py-1 rounded pointer-events-auto transition-colors"
            >
              ⬅️ 50ms
            </button>
            <button
              onTouchEnd={handleNudgeRight}
              className="bg-blue-500 active:bg-blue-700 text-white text-xs font-bold px-2 py-1 rounded pointer-events-auto transition-colors"
            >
              50ms ➡️
            </button>
          </div>
        )}

        {/* Enhanced trim handles - larger and more visible in trim mode */}
        <div
          className={`absolute left-0 top-0 cursor-ew-resize flex items-center justify-center touch-manipulation transition-all duration-200 select-none ${
            isInTrimMode ? 'w-12 h-full bg-accent opacity-100 border-r-2 border-accent-foreground' : 'w-6 h-full bg-accent opacity-70 group-hover:opacity-100'
          }`}
          onTouchStart={(e) => handleTrimTouchStart(e, 'start')}
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
          onTouchStart={(e) => handleTrimTouchStart(e, 'end')}
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
      
      {isInTrimMode && !isResizing && !isDragging && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
          TRIM MODE - Double-tap to exit
        </div>
      )}
    </div>
  );
}