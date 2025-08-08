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
  snapEnabled = true 
}: UseSnapToGridProps) {
  
  const snapToGrid = useCallback((timeInSeconds: number): number => {
    if (!snapEnabled) return timeInSeconds;
    
    const beatDuration = 60 / bpm;
    const snapInterval = beatDuration / subdivision;
    
    return Math.round(timeInSeconds / snapInterval) * snapInterval;
  }, [bpm, subdivision, snapEnabled]);

  const getSnapPoints = useCallback((duration: number): number[] => {
    const points: number[] = [];
    const beatDuration = 60 / bpm;
    const snapInterval = beatDuration / subdivision;
    
    for (let time = 0; time <= duration; time += snapInterval) {
      points.push(time);
    }
    
    return points;
  }, [bpm, subdivision]);

  const findNearestSnapPoint = useCallback((time: number, threshold: number = 0.1): number | null => {
    if (!snapEnabled) return null;
    
    const snappedTime = snapToGrid(time);
    const distance = Math.abs(time - snappedTime);
    
    return distance <= threshold ? snappedTime : null;
  }, [snapToGrid, snapEnabled]);

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