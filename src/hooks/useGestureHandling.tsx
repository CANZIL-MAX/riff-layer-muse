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

    if (e.touches.length === 1) {
      // Single finger - prepare for pan
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.touches.length === 2 && onZoom) {
      // Two fingers - prepare for pinch zoom
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
      // Single finger pan
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      onPan(deltaX, deltaY);
      
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.touches.length === 2 && onZoom && lastTouchRef.current.distance) {
      // Two finger zoom
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