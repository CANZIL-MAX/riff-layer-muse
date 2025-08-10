import { useRef, useCallback, useEffect, memo } from 'react';
import { AudioTrack } from '@/services/ProjectManager';
import { TrackControls } from '@/components/TrackControls';
import { WaveformBlock } from '@/components/WaveformBlock';
import { MeasureRuler } from '@/components/MeasureRuler';
import { BeatGrid } from '@/components/BeatGrid';
import { ZoomControls } from '@/components/ZoomControls';
import { useTimeline } from '@/hooks/useTimeline';
import { useTimelineZoom } from '@/hooks/useTimelineZoom';
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
  bpm?: number;
  snapToGrid?: boolean;
  onScrollToTime?: (scrollToTimeFunction: (time: number) => void) => void;
}

export const DAWTimeline = memo(function DAWTimeline({ 
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
  onTrackUpdate,
  bpm = 120,
  snapToGrid = true,
  onScrollToTime
}: DAWTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { totalDuration, formatTime } = useTimeline(tracks);
  
  const baseTimelineWidth = 800;
  const {
    zoomLevel,
    zoomedWidth,
    scrollPosition,
    maxScrollPosition,
    timeToPixels,
    pixelsToTime,
    zoomIn,
    zoomOut,
    setZoom,
    fitToContent,
    scroll,
    scrollToTime,
  } = useTimelineZoom({ totalDuration, baseWidth: baseTimelineWidth });

  // Auto-scroll to keep playhead visible during playback
  useEffect(() => {
    if (isPlaying) {
      const playheadPosition = timeToPixels(currentTime);
      const visibleStart = scrollPosition;
      const visibleEnd = scrollPosition + baseTimelineWidth;
      
      if (playheadPosition < visibleStart || playheadPosition > visibleEnd - 50) {
        scrollToTime(currentTime);
      }
    }
  }, [currentTime, isPlaying, timeToPixels, scrollPosition, scrollToTime, baseTimelineWidth]);

  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left + scrollPosition;
    const time = pixelsToTime(x);
    
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  }, [pixelsToTime, scrollPosition, totalDuration, onSeek]);

  // Handle scroll wheel for horizontal scrolling and zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      event.preventDefault();
      const zoomDirection = event.deltaY > 0 ? -1 : 1;
      if (zoomDirection > 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    } else {
      // Horizontal scroll
      event.preventDefault();
      scroll(event.deltaY * 2);
    }
  }, [scroll, zoomIn, zoomOut]);

  const currentTimePosition = timeToPixels(currentTime) - scrollPosition;
  const recordingStartPosition = timeToPixels(recordingStartTime) - scrollPosition;

  // Expose scrollToTime function to parent
  useEffect(() => {
    if (onScrollToTime) {
      onScrollToTime(scrollToTime);
    }
  }, [onScrollToTime, scrollToTime]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Track Controls Panel */}
        <div className="flex flex-col bg-layer-bg border-r lg:border-r border-b lg:border-b-0 border-border w-full lg:w-auto">
          {/* Header */}
          <div className="h-8 border-b border-border bg-timeline flex items-center px-3">
            <span className="text-xs font-medium text-muted-foreground">Tracks</span>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">{tracks.length}</span>
          </div>

          {/* Track controls */}
          <div className="flex-1 lg:max-h-80 overflow-y-auto">
            {tracks.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                No tracks
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 p-2 lg:p-0 lg:gap-0">
                {tracks.map((track, index) => (
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Zoom Controls */}
          <div className="flex items-center justify-between p-2 border-b border-border">
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onSetZoom={setZoom}
              onFitToContent={fitToContent}
            />
            <div className="text-xs text-muted-foreground hidden sm:block">
              Pinch to zoom, Swipe to scroll
            </div>
          </div>

          {/* Scrollable timeline container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-hidden touch-pan-x"
            onWheel={handleWheel}
          >
            {/* Timeline content */}
            <div 
              className="relative overflow-x-auto overflow-y-hidden h-full"
              style={{ 
                width: `100%`,
                minWidth: `${baseTimelineWidth}px`
              }}
              onScroll={(e) => {
                const newScrollPosition = e.currentTarget.scrollLeft;
                if (newScrollPosition !== scrollPosition) {
                  scroll(newScrollPosition - scrollPosition);
                }
              }}
            >
              {/* Measure ruler - now inside scrollable area */}
              <div 
                className="relative"
                style={{ 
                  width: `${zoomedWidth}px`,
                  transform: `translateX(-${scrollPosition}px)`
                }}
              >
                <MeasureRuler 
                  timelineWidth={zoomedWidth} 
                  totalDuration={totalDuration}
                  bpm={bpm}
                />
              </div>

              <div 
                ref={timelineRef}
                data-timeline
                className="relative bg-timeline/30 cursor-pointer min-h-[200px]"
                style={{ width: `${zoomedWidth}px`, transform: `translateX(-${scrollPosition}px)` }}
                onClick={handleTimelineClick}
              >
                {/* Beat Grid - now inside timeline */}
                <BeatGrid
                  timelineWidth={zoomedWidth}
                  totalDuration={totalDuration}
                  bpm={bpm}
                  timeToPixels={timeToPixels}
                  showGrid={true}
                  subdivision={4}
                  zoomLevel={zoomLevel}
                />
                {/* Current playback position */}
                <div
                  className="absolute top-0 w-0.5 h-full bg-primary z-30 pointer-events-none"
                  style={{ left: `${timeToPixels(currentTime)}px` }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rounded-full shadow-glow" />
                </div>

                {/* Recording start position cursor */}
                {recordingStartTime > 0 && (
                  <div
                    className="absolute top-0 w-0.5 h-full bg-recording z-30"
                    style={{ left: `${timeToPixels(recordingStartTime)}px` }}
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
                          timelineWidth={zoomedWidth}
                          onTrackUpdate={onTrackUpdate}
                          isPlaying={isPlaying}
                          currentTime={currentTime}
                          bpm={bpm}
                          snapToGrid={snapToGrid}
                          scrollOffset={scrollPosition}
                          zoomLevel={zoomLevel}
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
          </div>

          {/* Timeline info */}
          <div className="px-4 py-2 border-t border-border bg-timeline/50 text-sm text-muted-foreground">
            Duration: {formatTime(totalDuration)} | 
            Current: {formatTime(currentTime)} |
            {recordingStartTime > 0 && ` Recording starts at: ${formatTime(recordingStartTime)} |`}
            Tracks: {tracks.length} |
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </div>
    </Card>
  );
});