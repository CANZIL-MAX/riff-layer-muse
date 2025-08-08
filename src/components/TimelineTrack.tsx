import { AudioTrack } from '@/services/ProjectManager';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';

interface TimelineTrackProps {
  track: AudioTrack;
  index: number;
  totalDuration: number;
  timeToPixels: (time: number, width: number) => number;
  onToggleMute: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  width: number;
}

export function TimelineTrack({ 
  track, 
  index, 
  totalDuration, 
  timeToPixels, 
  onToggleMute, 
  onRemove,
  width 
}: TimelineTrackProps) {
  const trackWidth = timeToPixels(track.duration || 0, width);
  const trackOffset = 0; // For now, all tracks start at 0

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50">
      {/* Track Controls */}
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <span className="text-sm font-medium w-16 truncate">
          {track.name}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onToggleMute(track.id)}
          className={`w-6 h-6 p-0 ${track.isMuted ? 'text-muted-foreground' : 'text-primary'}`}
        >
          {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(track.id)}
          className="w-6 h-6 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Track Visualization */}
      <div className="flex-1 relative bg-muted/30 rounded h-12 overflow-hidden">
        {/* Track waveform placeholder */}
        <div 
          className={`h-full rounded transition-all duration-200 ${
            track.isMuted 
              ? 'bg-muted-foreground/20' 
              : `bg-gradient-to-r from-primary/60 to-primary/40`
          }`}
          style={{ 
            width: `${Math.min(trackWidth, width)}px`,
            marginLeft: `${trackOffset}px`
          }}
        >
          {/* Waveform visualization would go here */}
          <div className="w-full h-full bg-gradient-to-t from-black/10 to-transparent flex items-center justify-center">
            <span className="text-xs text-foreground/60 font-mono">
              {Math.round((track.duration || 0) * 10) / 10}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}