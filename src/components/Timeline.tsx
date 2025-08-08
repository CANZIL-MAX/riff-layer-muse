import { useRef, useCallback, useEffect } from 'react';
import { AudioTrack } from '@/services/ProjectManager';
import { TimelineTrack } from '@/components/TimelineTrack';
import { useTimeline } from '@/hooks/useTimeline';
import { Card } from '@/components/ui/card';

interface TimelineProps {
  tracks: AudioTrack[];
  currentTime: number;
  isPlaying: boolean;
  recordingStartTime: number;
  onRecordingStartTimeChange: (time: number) => void;
  onSeek: (time: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
}

export function Timeline({ 
  tracks, 
  currentTime,
  isPlaying,
  recordingStartTime,
  onRecordingStartTimeChange,
  onSeek,
  onToggleTrackMute, 
  onRemoveTrack 
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { 
    totalDuration, 
    formatTime, 
    timeToPixels, 
    pixelsToTime, 
    isDragging, 
    setIsDragging 
  } = useTimeline(tracks);

  const timelineWidth = 600; // Fixed width for consistent calculations

  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = pixelsToTime(x, timelineWidth);
    
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  }, [pixelsToTime, timelineWidth, totalDuration, onSeek]);

  const handleRecordingCursorDrag = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = pixelsToTime(x, timelineWidth);
    
    onRecordingStartTimeChange(Math.max(0, Math.min(time, totalDuration)));
  }, [pixelsToTime, timelineWidth, totalDuration, onRecordingStartTimeChange]);

  const handleMouseDown = useCallback((event: React.MouseEvent, isRecordingCursor: boolean) => {
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = pixelsToTime(x, timelineWidth);
      const clampedTime = Math.max(0, Math.min(time, totalDuration));
      
      if (isRecordingCursor) {
        onRecordingStartTimeChange(clampedTime);
      } else {
        onSeek(clampedTime);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [setIsDragging, pixelsToTime, timelineWidth, totalDuration, onRecordingStartTimeChange, onSeek]);

  // Generate time markers
  const timeMarkers = [];
  const markerInterval = totalDuration > 60 ? 10 : 5; // 10s intervals if > 1min, else 5s
  for (let i = 0; i <= totalDuration; i += markerInterval) {
    timeMarkers.push(i);
  }

  const currentTimePosition = timeToPixels(currentTime, timelineWidth);
  const recordingStartPosition = timeToPixels(recordingStartTime, timelineWidth);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Timeline</h3>
          <div className="text-sm text-muted-foreground">
            Duration: {formatTime(totalDuration)}
          </div>
        </div>

        {/* Time ruler */}
        <div className="relative">
          <div 
            ref={timelineRef}
            className="relative bg-muted/30 rounded-lg h-8 cursor-pointer border-2 border-border/50"
            style={{ width: `${timelineWidth}px` }}
            onClick={handleTimelineClick}
          >
            {/* Time markers */}
            {timeMarkers.map((time) => (
              <div
                key={time}
                className="absolute top-0 h-full flex flex-col justify-between pointer-events-none"
                style={{ left: `${timeToPixels(time, timelineWidth)}px` }}
              >
                <div className="w-px h-full bg-border"></div>
                <span className="text-xs text-muted-foreground -translate-x-1/2 mt-1">
                  {formatTime(time)}
                </span>
              </div>
            ))}

            {/* Current playback position */}
            <div
              className="absolute top-0 w-0.5 h-full bg-primary z-20 pointer-events-none"
              style={{ left: `${currentTimePosition}px` }}
            >
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full"></div>
            </div>

            {/* Recording start position cursor */}
            <div
              className="absolute top-0 w-0.5 h-full bg-destructive z-20 cursor-grab active:cursor-grabbing"
              style={{ left: `${recordingStartPosition}px` }}
              onMouseDown={(e) => handleMouseDown(e, true)}
            >
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-destructive rounded-full"></div>
              <div className="absolute -top-6 -left-8 text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded whitespace-nowrap">
                {formatTime(recordingStartTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Track list */}
        <div className="space-y-1">
          {tracks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tracks yet</p>
              <p className="text-sm">Record or upload audio to see them on the timeline</p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <TimelineTrack
                key={track.id}
                track={track}
                index={index}
                totalDuration={totalDuration}
                timeToPixels={timeToPixels}
                onToggleMute={onToggleTrackMute}
                onRemove={onRemoveTrack}
                width={timelineWidth}
              />
            ))
          )}
        </div>

        {/* Recording info */}
        {recordingStartTime > 0 && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            Next recording will start at: <span className="font-mono text-foreground">{formatTime(recordingStartTime)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}