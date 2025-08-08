import { useRef, useCallback } from 'react';
import { AudioTrack } from '@/services/ProjectManager';
import { TrackControls } from '@/components/TrackControls';
import { WaveformBlock } from '@/components/WaveformBlock';
import { MeasureRuler } from '@/components/MeasureRuler';
import { useTimeline } from '@/hooks/useTimeline';
import { Card } from '@/components/ui/card';

interface DAWTimelineProps {
  tracks: AudioTrack[];
  currentTime: number;
  isPlaying: boolean;
  recordingStartTime: number;
  onRecordingStartTimeChange: (time: number) => void;
  onSeek: (time: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackSolo: (trackId: string) => void;
  onToggleTrackRecord: (trackId: string) => void;
  onTrackVolumeChange: (trackId: string, volume: number) => void;
  onRemoveTrack: (trackId: string) => void;
  onUpdateTrackName: (trackId: string, name: string) => void;
  onTrackUpdate: (trackId: string, updates: Partial<AudioTrack>) => void;
}

export function DAWTimeline({ 
  tracks, 
  currentTime,
  isPlaying,
  recordingStartTime,
  onRecordingStartTimeChange,
  onSeek,
  onToggleTrackMute, 
  onToggleTrackSolo,
  onToggleTrackRecord,
  onTrackVolumeChange,
  onRemoveTrack,
  onUpdateTrackName,
  onTrackUpdate
}: DAWTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { 
    totalDuration, 
    formatTime, 
    timeToPixels, 
    pixelsToTime 
  } = useTimeline(tracks);

  const timelineWidth = 800; // Wider timeline for better editing

  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = pixelsToTime(x, timelineWidth);
    
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  }, [pixelsToTime, timelineWidth, totalDuration, onSeek]);

  const currentTimePosition = timeToPixels(currentTime, timelineWidth);
  const recordingStartPosition = timeToPixels(recordingStartTime, timelineWidth);

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Track Controls Panel */}
        <div className="flex flex-col bg-layer-bg border-r border-border">
          {/* Header */}
          <div className="h-8 border-b border-border bg-timeline flex items-center px-3">
            <span className="text-xs font-medium text-muted-foreground">Tracks</span>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">{tracks.length}</span>
          </div>

          {/* Track controls */}
          <div className="flex-1">
            {tracks.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                No tracks
              </div>
            ) : (
              tracks.map((track, index) => (
                <TrackControls
                  key={track.id}
                  track={track}
                  index={index}
                  onToggleMute={onToggleTrackMute}
                  onToggleSolo={onToggleTrackSolo}
                  onToggleRecord={onToggleTrackRecord}
                  onVolumeChange={onTrackVolumeChange}
                  onRemove={onRemoveTrack}
                  onUpdateTrackName={onUpdateTrackName}
                />
              ))
            )}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="flex-1 overflow-x-auto">
          {/* Measure ruler */}
          <MeasureRuler 
            timelineWidth={timelineWidth} 
            totalDuration={totalDuration}
          />

          {/* Timeline content */}
          <div className="relative">
            <div 
              ref={timelineRef}
              className="relative bg-timeline/30 cursor-pointer min-h-[200px]"
              style={{ width: `${timelineWidth}px` }}
              onClick={handleTimelineClick}
            >
              {/* Current playback position */}
              <div
                className="absolute top-0 w-0.5 h-full bg-primary z-30 pointer-events-none"
                style={{ left: `${currentTimePosition}px` }}
              >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full shadow-glow" />
              </div>

              {/* Recording start position cursor */}
              {recordingStartTime > 0 && (
                <div
                  className="absolute top-0 w-0.5 h-full bg-recording z-30"
                  style={{ left: `${recordingStartPosition}px` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-recording rounded-full shadow-recording" />
                  <div className="absolute -top-6 -left-8 text-xs bg-recording text-recording-foreground px-2 py-1 rounded whitespace-nowrap">
                    REC: {formatTime(recordingStartTime)}
                  </div>
                </div>
              )}

              {/* Track lanes */}
              <div className="space-y-1 pt-2">
                {tracks.map((track, index) => (
                  <div 
                    key={track.id} 
                    className="relative h-16 border-b border-border/20 bg-layer-bg/20"
                  >
                    {track.audioData && (
                      <WaveformBlock
                        track={track}
                        timeToPixels={timeToPixels}
                        pixelsToTime={pixelsToTime}
                        timelineWidth={timelineWidth}
                        onTrackUpdate={onTrackUpdate}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {tracks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="font-medium">Your timeline is empty</p>
                    <p className="text-sm">Record or upload audio to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline info */}
          <div className="px-4 py-2 border-t border-border bg-timeline/50 text-sm text-muted-foreground">
            Duration: {formatTime(totalDuration)} | 
            Current: {formatTime(currentTime)} |
            {recordingStartTime > 0 && ` Recording starts at: ${formatTime(recordingStartTime)} |`}
            Tracks: {tracks.length}
          </div>
        </div>
      </div>
    </Card>
  );
}