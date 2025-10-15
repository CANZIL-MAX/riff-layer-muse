import { useRef, useEffect } from 'react';
import { useGestureHandling } from '@/hooks/useGestureHandling';
import { useNativePlatform } from '@/hooks/useNativePlatform';

interface TimelinePanZoomProps {
  children: React.ReactNode;
  onPan: (deltaX: number) => void;
  onZoom?: (scale: number, centerX: number) => void;
  className?: string;
}

export function TimelinePanZoom({ children, onPan, onZoom, className = '' }: TimelinePanZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isNative } = useNativePlatform();

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useGestureHandling({
    onPan: (deltaX) => onPan(-deltaX), // Invert for natural scrolling
    onZoom,
    isEnabled: true, // iOS-only app - always enable
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isNative, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div 
      ref={containerRef}
      className={`${className} ${isNative ? 'touch-pan-x touch-pinch-zoom' : ''}`}
      data-timeline
    >
      {children}
    </div>
  );
}