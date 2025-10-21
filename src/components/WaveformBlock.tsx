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
  const touchStartRef = useRef<{ x: number; y: number; time: number; timelineLeft: number } | null>(null);
  const dragThresholdPx = 10; // iOS standard: 10px to distinguish tap from drag
  const doubleTapTimeMs = 300; // iOS standard: 300ms for double-tap
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
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

  // Native iOS touch handling - proper gesture detection with movement threshold
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent iOS default behavior
    // ✅ REMOVED stopPropagation - parent TimelinePanZoom now respects our touch events
    
    console.log('🎵 WaveformBlock handling touch start on:', track.name);
    
    const touch = e.touches[0];
    const now = Date.now();
    const timelineRect = blockRef.current?.closest('[data-timeline]')?.getBoundingClientRect();
    
    // Store initial touch info for gesture detection
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now,
      timelineLeft: timelineRect?.left || 0
    };
    
    // Check for double-tap
    const timeSinceLastTap = now - lastTapTime.current;
    if (timeSinceLastTap < doubleTapTimeMs) {
      // Double-tap detected - toggle trim mode
      console.log('👆👆 Double-tap detected - toggling trim mode');
      setIsInTrimMode(!isInTrimMode);
      setShowSnapIndicator(true);
      setTimeout(() => setShowSnapIndicator(false), 1000);
      
      if ('vibrate' in navigator) navigator.vibrate(30);
      touchStartRef.current = null; // Cancel any further processing
      return;
    }
    
    lastTapTime.current = now;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (isInTrimMode) return; // Don't interfere with trim handles
    if (isDragging) return; // Already dragging
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If movement exceeds threshold, start dragging
    if (deltaX > dragThresholdPx || deltaY > dragThresholdPx) {
      console.log('🎯 Movement threshold exceeded, starting drag');
      
      const timelineElement = blockRef.current?.closest('[data-timeline]');
      const timelineRect = timelineElement?.getBoundingClientRect();
      
      // ✅ Get scroll position from parent scroll container
      const scrollContainer = timelineElement?.closest('[style*="overflow"]') as HTMLElement;
      const actualScrollOffset = scrollContainer?.scrollLeft || scrollOffset || 0;
      
      console.log('🔍 DRAG GEOMETRY DEBUG:', {
        blockRef: !!blockRef.current,
        timelineElement: !!timelineElement,
        timelineRect: !!timelineRect,
        scrollContainer: !!scrollContainer,
        actualScrollOffset,
        propScrollOffset: scrollOffset
      });
      
      // ✅ Validation: Ensure we have valid geometry
      if (!timelineRect || !isFinite(actualScrollOffset)) {
        console.error('❌ Timeline geometry invalid - cannot drag', {
          reason: !timelineRect ? 'no timelineRect' : 'invalid scrollOffset',
          timelineRect,
          actualScrollOffset
        });
        return;
      }
      
      const startX = touchStartRef.current.x - touchStartRef.current.timelineLeft + actualScrollOffset;
      const initialStartTime = track.startTime || 0;
      
      setIsDragging(true);
      if ('vibrate' in navigator) navigator.vibrate(10);
      
      const handleDragMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();
        
        if (!moveEvent.touches || moveEvent.touches.length === 0) {
          console.warn('⚠️ No touches in drag move event');
          return;
        }
        
        const currentTouch = moveEvent.touches[0];
        const currentX = currentTouch.clientX - timelineRect.left + scrollOffset;
        const deltaX = currentX - startX;
        const deltaTime = pixelsToTime(deltaX);
        
        if (!isFinite(deltaTime)) {
          console.error('❌ Invalid deltaTime in drag:', { deltaX, deltaTime });
          return;
        }
        
        let newStartTime = Math.max(0, initialStartTime + deltaTime);
        
        if (snapToGrid) {
          newStartTime = snapToGridFn(newStartTime);
          setShowSnapIndicator(true);
        } else {
          setShowSnapIndicator(false);
        }
        
        setLocalStartTime(newStartTime);
      };
      
    const handleDragEnd = () => {
      if (!isMountedRef.current) {
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
        return;
      }
      
      if (localStartTime !== null && isFinite(localStartTime)) {
        console.log('🎯 Applying final startTime update:', localStartTime);
        onTrackUpdate(track.id, { startTime: localStartTime });
        setLocalStartTime(null);
      } else {
        console.error('❌ Invalid localStartTime - not updating:', localStartTime);
      }
      setIsDragging(false);
      setShowSnapIndicator(false);
      touchStartRef.current = null;
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
      
      // Clear the start ref so we don't re-trigger
      touchStartRef.current = null;
      
      document.addEventListener('touchmove', handleDragMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    // Touch ended without significant movement - it's a TAP
    const touchDuration = Date.now() - touchStartRef.current.time;
    
    if (touchDuration < 500) {
      // Quick tap - select the block
      console.log('👆 Single tap detected - selecting block');
      setIsSelected(true);
      if ('vibrate' in navigator) navigator.vibrate(10);
      
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      selectionTimer.current = setTimeout(() => {
        setIsSelected(false);
      }, 5000);
    }
    
    touchStartRef.current = null;
  };

  // This function is no longer needed - drag is handled by handleTouchMove with threshold
  // Keeping for backwards compatibility but it won't be called

  // Nudge functions for precise timing adjustments
  const handleNudgeLeft = (e: React.TouchEvent) => {
    e.preventDefault();
    // ✅ Removed stopPropagation
    
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
    // ✅ Removed stopPropagation
    
    const nudgeAmount = 0.050; // 50ms
    const newStartTime = (track.startTime || 0) + nudgeAmount;
    onTrackUpdate(track.id, { startTime: newStartTime });
    console.log(`➡️ Nudged ${track.name} right by 50ms, new startTime: ${newStartTime}`);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Native touch handlers for trim operations - REWRITTEN for event isolation and waveform alignment
  const handleTrimTouchStart = (e: React.TouchEvent, side: 'start' | 'end') => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      console.log(`✂️ TRIM HANDLE TOUCHED:`, { 
        side, 
        initialTrimStart: track.trimStart || 0,
        initialTrimEnd: track.trimEnd || track.duration,
        initialStartTime: track.startTime || 0 
      });
      
      const touch = e.touches[0];
      const timelineElement = blockRef.current?.closest('[data-timeline]');
      const timelineRect = timelineElement?.getBoundingClientRect();
      
      // ✅ Get scroll position from parent scroll container
      const scrollContainer = timelineElement?.closest('[style*="overflow"]') as HTMLElement;
      const actualScrollOffset = scrollContainer?.scrollLeft || scrollOffset || 0;
      
      console.log('🔍 TRIM GEOMETRY DEBUG:', {
        blockRef: !!blockRef.current,
        timelineElement: !!timelineElement,
        timelineRect: !!timelineRect,
        scrollContainer: !!scrollContainer,
        actualScrollOffset,
        propScrollOffset: scrollOffset
      });
      
      if (!timelineRect || !isFinite(actualScrollOffset)) {
        console.error('❌ Invalid geometry - cannot trim', {
          reason: !timelineRect ? 'no timelineRect' : 'invalid scrollOffset',
          timelineRect,
          actualScrollOffset
        });
        return;
      }
      
      const startX = touch.clientX - timelineRect.left + actualScrollOffset;
      
      setIsResizing(side);
      setShowSnapIndicator(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      
      let currentTrimStart = track.trimStart || 0;
      let currentTrimEnd = track.trimEnd || track.duration;
      let currentStartTime = track.startTime || 0;
      const duration = track.duration;
      
      const handleMove = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();
        
        if (!moveEvent.touches || moveEvent.touches.length === 0) {
          console.warn('⚠️ No touches in trim move event');
          return;
        }
        
        const currentTouch = moveEvent.touches[0];
        const currentX = currentTouch.clientX - timelineRect.left + actualScrollOffset;
        const deltaX = currentX - startX;
        const deltaTime = pixelsToTime(deltaX);
        
        if (!isFinite(deltaTime)) {
          console.error('❌ Invalid deltaTime:', { deltaX, deltaTime });
          return;
        }
        
        if (side === 'start') {
          const newTrimStart = Math.max(0, Math.min(currentTrimStart + deltaTime, currentTrimEnd - 0.1));
          
          const trimChange = newTrimStart - currentTrimStart;
          const newStartTime = currentStartTime + trimChange;
          
          currentTrimStart = newTrimStart;
          currentStartTime = newStartTime;
          
          setLocalTrimStart(newTrimStart);
          setLocalStartTime(newStartTime);
          
          console.log('✂️ TRIM START MOVE:', {
            deltaX,
            deltaTime,
            trimChange,
            newTrimStart,
            newStartTime,
            visuallyStaysAtPixel: timeToPixels(newStartTime)
          });
        } else {
          const newTrimEnd = Math.max(currentTrimStart + 0.1, Math.min(currentTrimEnd + deltaTime, duration));
          
          currentTrimEnd = newTrimEnd;
          setLocalTrimEnd(newTrimEnd);
          
          console.log('✂️ TRIM END MOVE:', {
            deltaX,
            deltaTime,
            newTrimEnd,
            startTimeUnchanged: currentStartTime
          });
        }
      };
      
      const handleEnd = () => {
        if (!isMountedRef.current) {
          document.removeEventListener('touchmove', handleMove);
          document.removeEventListener('touchend', handleEnd);
          return;
        }
        
        if (side === 'start') {
          console.log('✂️ TRIM START END:', { 
            finalTrimStart: currentTrimStart, 
            finalStartTime: currentStartTime 
          });
          
          if (!isFinite(currentTrimStart) || !isFinite(currentStartTime)) {
            console.error('❌ Invalid trim values - not updating:', { currentTrimStart, currentStartTime });
          } else {
            onTrackUpdate(track.id, { 
              trimStart: currentTrimStart,
              startTime: currentStartTime 
            });
          }
          
          setLocalTrimStart(null);
          setLocalStartTime(null);
        } else {
          console.log('✂️ TRIM END END:', { finalTrimEnd: currentTrimEnd });
          
          if (!isFinite(currentTrimEnd)) {
            console.error('❌ Invalid trim end value - not updating:', { currentTrimEnd });
          } else {
            onTrackUpdate(track.id, { trimEnd: currentTrimEnd });
          }
          
          setLocalTrimEnd(null);
        }
        
        setIsResizing(false);
        setShowSnapIndicator(false);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
      
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      
    } catch (error) {
      console.error('❌ Trim operation failed:', error);
      setIsResizing(false);
      setShowSnapIndicator(false);
    }
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
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
            touchAction: 'none',
            zIndex: 20
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
            touchAction: 'none',
            zIndex: 20
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