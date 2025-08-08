import { useCallback } from 'react';
import { MetronomeEngine } from '@/services/MetronomeService';

interface UseSnapToGridProps {
  bpm: number;
  subdivision?: number;
  snapEnabled?: boolean;
}

export function useSnapToGrid({ 
  bpm, 
  subdivision = 4, 
  snapEnabled = true,
  zoomLevel = 1 
}: UseSnapToGridProps & { zoomLevel?: number }) {
  
  const snapToGrid = useCallback((timeInSeconds: number): number => {
    if (!snapEnabled) return timeInSeconds;
    
    const beatDuration = 60 / bpm;
    // Increase subdivision detail based on zoom level
    let effectiveSubdivision = subdivision;
    if (zoomLevel >= 2) effectiveSubdivision = subdivision * 2;
    if (zoomLevel >= 4) effectiveSubdivision = subdivision * 4;
    if (zoomLevel >= 6) effectiveSubdivision = subdivision * 8;
    
    const snapInterval = beatDuration / effectiveSubdivision;
    
    return Math.round(timeInSeconds / snapInterval) * snapInterval;
  }, [bpm, subdivision, snapEnabled, zoomLevel]);

  const getSnapPoints = useCallback((duration: number): number[] => {
    const points: number[] = [];
    const beatDuration = 60 / bpm;
    
    // Increase subdivision detail based on zoom level
    let effectiveSubdivision = subdivision;
    if (zoomLevel >= 2) effectiveSubdivision = subdivision * 2;
    if (zoomLevel >= 4) effectiveSubdivision = subdivision * 4;
    if (zoomLevel >= 6) effectiveSubdivision = subdivision * 8;
    
    const snapInterval = beatDuration / effectiveSubdivision;
    
    for (let time = 0; time <= duration; time += snapInterval) {
      points.push(time);
    }
    
    return points;
  }, [bpm, subdivision, zoomLevel]);

  const findNearestSnapPoint = useCallback((time: number, threshold: number = 0.1): number | null => {
    if (!snapEnabled) return null;
    
    // Reduce threshold when zoomed in for more precise snapping
    const adjustedThreshold = threshold / Math.max(1, zoomLevel / 2);
    
    const snappedTime = snapToGrid(time);
    const distance = Math.abs(time - snappedTime);
    
    return distance <= adjustedThreshold ? snappedTime : null;
  }, [snapToGrid, snapEnabled, zoomLevel]);

  const getSnapIndicators = useCallback((
    currentTime: number, 
    duration: number, 
    timeToPixels: (time: number, width: number) => number,
    timelineWidth: number
  ) => {
    const snapPoints = getSnapPoints(duration);
    const snapTime = findNearestSnapPoint(currentTime, 0.5);
    
    return snapPoints.map(point => ({
      time: point,
      position: timeToPixels(point, timelineWidth),
      isActive: snapTime === point,
      isBeat: (point * bpm / 60) % 1 === 0,
      isMeasure: (point * bpm / 60) % 4 === 0,
    }));
  }, [getSnapPoints, findNearestSnapPoint, bpm]);

  return {
    snapToGrid,
    getSnapPoints,
    findNearestSnapPoint,
    getSnapIndicators,
  };
}