import { useCallback, useRef } from 'react';

interface GestureHandlingOptions {
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom?: (scale: number, centerX: number) => void;
  isEnabled?: boolean;
}

export function useGestureHandling({ onPan, onZoom, isEnabled = true }: GestureHandlingOptions) {
  const lastTouchRef = useRef<{ x: number; y: number; distance?: number } | null>(null);
  const initialPinchDistance = useRef<number>(0);

  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;

    const target = e.target as HTMLElement;
    const isOnWaveformBlock = target.closest('[data-waveform-block]');
    
    // 🎯 Smart event delegation: Single finger on waveform block? Let block handle it
    if (e.touches.length === 1 && isOnWaveformBlock) {
      console.log('🎯 Touch on waveform block, letting block handle it');
      return; // Don't preventDefault, don't handle - let WaveformBlock take control
    }
    
    console.log('🌐 Timeline handling touch:', e.touches.length, 'fingers', isOnWaveformBlock ? 'on block' : 'on timeline');

    if (e.touches.length === 1) {
      // Single finger on empty timeline - prepare for pan
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.touches.length === 2 && onZoom) {
      // Two fingers anywhere - always handle pinch zoom
      e.preventDefault(); // Prevent iOS zoom
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      
      initialPinchDistance.current = distance;
      lastTouchRef.current = {
        x: center.x,
        y: center.y,
        distance
      };
    }
  }, [isEnabled, onZoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isEnabled || !lastTouchRef.current) return;

    if (e.touches.length === 1) {
      // Single finger pan (only on timeline, not on blocks)
      e.preventDefault(); // Prevent iOS scroll
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      onPan(deltaX, deltaY);
      
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.touches.length === 2 && onZoom && lastTouchRef.current.distance) {
      // Two finger zoom - always handle
      e.preventDefault(); // Prevent iOS zoom
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      
      const scale = currentDistance / initialPinchDistance.current;
      
      onZoom(scale, center.x);
      
      lastTouchRef.current = {
        x: center.x,
        y: center.y,
        distance: currentDistance
      };
    }
  }, [isEnabled, onPan, onZoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    initialPinchDistance.current = 0;
  }, []);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}