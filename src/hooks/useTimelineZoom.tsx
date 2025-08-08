import { useState, useCallback, useMemo } from 'react';

interface UseTimelineZoomProps {
  totalDuration: number;
  baseWidth: number;
}

export function useTimelineZoom({ totalDuration, baseWidth }: UseTimelineZoomProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Calculate derived values
  const zoomedWidth = useMemo(() => baseWidth * zoomLevel, [baseWidth, zoomLevel]);
  const visibleDuration = useMemo(() => totalDuration / zoomLevel, [totalDuration, zoomLevel]);
  const maxScrollPosition = useMemo(() => Math.max(0, zoomedWidth - baseWidth), [zoomedWidth, baseWidth]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 8));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.25));
  }, []);

  const setZoom = useCallback((level: number) => {
    setZoomLevel(Math.max(0.25, Math.min(level, 8)));
  }, []);

  const fitToContent = useCallback(() => {
    setZoomLevel(1);
    setScrollPosition(0);
  }, []);

  // Scroll controls
  const scroll = useCallback((deltaX: number) => {
    setScrollPosition(prev => Math.max(0, Math.min(prev + deltaX, maxScrollPosition)));
  }, [maxScrollPosition]);

  const scrollToTime = useCallback((time: number) => {
    const targetPosition = (time / totalDuration) * zoomedWidth;
    const centerOffset = baseWidth / 2;
    const newScrollPosition = Math.max(0, Math.min(targetPosition - centerOffset, maxScrollPosition));
    setScrollPosition(newScrollPosition);
  }, [totalDuration, zoomedWidth, baseWidth, maxScrollPosition]);

  // Time/pixel conversion with zoom
  const timeToPixels = useCallback((time: number) => {
    return (time / totalDuration) * zoomedWidth;
  }, [totalDuration, zoomedWidth]);

  const pixelsToTime = useCallback((pixels: number) => {
    return (pixels / zoomedWidth) * totalDuration;
  }, [zoomedWidth, totalDuration]);

  // Get visible time range
  const visibleTimeRange = useMemo(() => {
    const startTime = pixelsToTime(scrollPosition);
    const endTime = pixelsToTime(scrollPosition + baseWidth);
    return { startTime, endTime };
  }, [pixelsToTime, scrollPosition, baseWidth]);

  return {
    zoomLevel,
    zoomedWidth,
    visibleDuration,
    scrollPosition,
    maxScrollPosition,
    visibleTimeRange,
    timeToPixels,
    pixelsToTime,
    zoomIn,
    zoomOut,
    setZoom,
    fitToContent,
    scroll,
    scrollToTime,
  };
}