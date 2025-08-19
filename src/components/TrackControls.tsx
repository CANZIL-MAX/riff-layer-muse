import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { AudioTrack } from '@/services/ProjectManager';
import { 
  VolumeXIcon, 
  Volume2Icon, 
  MicIcon, 
  RadioIcon, 
  Edit3,
  TrashIcon,
  HeadphonesIcon,
  BarChart3Icon
} from 'lucide-react';

interface TrackControlsProps {
  track: AudioTrack;
  index: number;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onToggleRecord: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onRemove: (trackId: string) => void;
  onUpdateTrackName: (trackId: string, name: string) => void;
  isSoloed?: boolean;
  hasSoloedTracks?: boolean;
}

export function TrackControls({
  track,
  index,
  onToggleMute,
  onToggleSolo,
  onToggleRecord,
  onVolumeChange,
  onRemove,
  onUpdateTrackName,
  isSoloed = false,
  hasSoloedTracks = false,
}: TrackControlsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(track.name);

  return (
    <div className="flex flex-col h-24 border-r border-border bg-layer-bg/50 min-w-[200px] group">
      {/* Track number and waveform icon */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/50">
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs font-mono text-primary">
          {index + 1}
        </div>
        <BarChart3Icon className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(track.id)}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <TrashIcon className="w-3 h-3" />
        </Button>
      </div>

      {/* Track name */}
      <div className="px-3 py-1 border-b border-border/50">
        {isEditingName ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              setIsEditingName(false);
              onUpdateTrackName(track.id, editName);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingName(false);
                onUpdateTrackName(track.id, editName);
              }
              if (e.key === 'Escape') {
                setIsEditingName(false);
                setEditName(track.name);
              }
            }}
            className="h-6 text-xs font-medium"
            autoFocus
          />
        ) : (
          <div 
            className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5 transition-colors"
            onClick={() => setIsEditingName(true)}
          >
            <span className="text-xs font-medium text-foreground truncate flex-1">{track.name}</span>
            <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1 px-2 py-1">
        {/* Mute button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleMute(track.id)}
          className={`h-6 w-8 text-xs font-bold ${
            track.isMuted || (hasSoloedTracks && !isSoloed)
              ? "bg-destructive text-destructive-foreground" 
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          M
        </Button>

        {/* Solo button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleSolo(track.id)}
          className={`h-6 w-8 text-xs font-bold ${
            isSoloed
              ? "bg-accent text-accent-foreground" 
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          S
        </Button>

        {/* Record button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleRecord(track.id)}
          className={`h-6 w-8 text-xs font-bold ${
            track.isRecording 
              ? "bg-recording text-recording-foreground" 
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          R
        </Button>

        {/* Input button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-8 text-xs font-bold hover:bg-muted text-muted-foreground"
        >
          I
        </Button>

        {/* Volume slider */}
        <div className="flex-1 px-2">
          <Slider
            value={[track.volume * 100]}
            onValueChange={(value) => onVolumeChange(track.id, value[0] / 100)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Volume icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {track.isMuted ? (
            <VolumeXIcon className="w-3 h-3 text-destructive" />
          ) : (
            <Volume2Icon className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}