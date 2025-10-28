import { useState, useCallback, useRef } from 'react';
import { AudioTrack } from '@/services/ProjectManager';

interface HistoryState {
  tracks: AudioTrack[];
  timestamp: number;
}

const MAX_HISTORY_SIZE = 50;

export function useUndoRedo(initialTracks: AudioTrack[]) {
  const [tracks, setTracks] = useState<AudioTrack[]>(initialTracks);
  const historyRef = useRef<HistoryState[]>([{ tracks: initialTracks, timestamp: Date.now() }]);
  const currentIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((newTracks: AudioTrack[]) => {
    // Remove any future history if we're not at the end
    if (currentIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
    }

    // Add new state
    historyRef.current.push({
      tracks: JSON.parse(JSON.stringify(newTracks)), // Deep clone
      timestamp: Date.now()
    });

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
    } else {
      currentIndexRef.current++;
    }

    setTracks(newTracks);
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
  }, []);

  const undo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      currentIndexRef.current--;
      const previousState = historyRef.current[currentIndexRef.current];
      const clonedTracks = JSON.parse(JSON.stringify(previousState.tracks));
      setTracks(clonedTracks);
      setCanUndo(currentIndexRef.current > 0);
      setCanRedo(true);
      return clonedTracks;
    }
    return null;
  }, []);

  const redo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      currentIndexRef.current++;
      const nextState = historyRef.current[currentIndexRef.current];
      const clonedTracks = JSON.parse(JSON.stringify(nextState.tracks));
      setTracks(clonedTracks);
      setCanUndo(true);
      setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
      return clonedTracks;
    }
    return null;
  }, []);

  return {
    tracks,
    setTracks: pushHistory,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
