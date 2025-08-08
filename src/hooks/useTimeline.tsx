import { useState, useCallback } from 'react';
import { AudioTrack } from '@/services/ProjectManager';

export function useTimeline(tracks: AudioTrack[]) {
  const [currentTime, setCurrentTime] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate total duration based on all tracks
  const totalDuration = tracks.reduce((max, track) => {
    return Math.max(max, track.duration || 0);
  }, 30); // Minimum 30 seconds

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  }, []);

  const timeToPixels = useCallback((time: number, width: number) => {
    return (time / totalDuration) * width;
  }, [totalDuration]);

  const pixelsToTime = useCallback((pixels: number, width: number) => {
    return (pixels / width) * totalDuration;
  }, [totalDuration]);

  return {
    currentTime,
    setCurrentTime,
    recordingStartTime,
    setRecordingStartTime,
    isDragging,
    setIsDragging,
    totalDuration,
    formatTime,
    timeToPixels,
    pixelsToTime,
  };
}