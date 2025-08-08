import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrashIcon, VolumeXIcon, Volume2Icon, Edit3 } from 'lucide-react';
import { AudioTrack, ProjectManager } from '@/services/ProjectManager';
import { WaveformDisplay } from './WaveformDisplay';

interface TimelineTrackProps {
  track: AudioTrack;
  index: number;
  totalDuration: number;
  timeToPixels: (time: number, width: number) => number;
  onToggleMute: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  onUpdateTrackName: (trackId: string, name: string) => void;
  width: number;
}

export function TimelineTrack({
  track,
  index,
  totalDuration,
  timeToPixels,
  onToggleMute,
  onRemove,
  onUpdateTrackName,
  width
}: TimelineTrackProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(track.name);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loadAudioBuffer = async () => {
      if (track.audioData && !audioBuffer) {
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          const buffer = await ProjectManager.base64ToAudioBuffer(track.audioData, audioContextRef.current);
          setAudioBuffer(buffer);
        } catch (error) {
          console.error('Error loading audio buffer for timeline:', error);
        }
      }
    };

    loadAudioBuffer();
  }, [track.audioData, audioBuffer]);

  const trackWidthPixels = timeToPixels(track.duration, width);
  const startPosition = timeToPixels(track.startTime || 0, width);

  return (
    <div className="flex items-center gap-3 h-12 group">
      {/* Track controls */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
        
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
            className="h-6 text-xs flex-1"
            autoFocus
          />
        ) : (
          <div 
            className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors flex-1"
            onClick={() => setIsEditingName(true)}
          >
            <span className="text-xs font-medium text-foreground truncate">{track.name}</span>
            <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleMute(track.id)}
          className={`h-6 w-6 p-0 ${track.isMuted ? "text-destructive" : "text-muted-foreground"}`}
        >
          {track.isMuted ? (
            <VolumeXIcon className="w-3 h-3" />
          ) : (
            <Volume2Icon className="w-3 h-3" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(track.id)}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <TrashIcon className="w-3 h-3" />
        </Button>
      </div>

      {/* Track visualization */}
      <div className="flex-1 relative">
        <div 
          className="h-10 rounded border border-border/50 overflow-hidden relative bg-muted/30"
          style={{ width: `${width}px` }}
        >
          {/* Empty space before track starts */}
          {startPosition > 0 && (
            <div 
              className="h-full bg-muted/20"
              style={{ width: `${startPosition}px` }}
            />
          )}
          
          {/* Waveform or track representation */}
          <div
            className="h-full"
            style={{ 
              width: `${trackWidthPixels}px`,
              marginLeft: `${startPosition}px`
            }}
          >
            {audioBuffer ? (
              <WaveformDisplay
                audioBuffer={audioBuffer}
                isPlaying={false}
                isMuted={track.isMuted}
                currentTime={0}
                width={300}
                height={40}
              />
            ) : (
              <div className={`h-full transition-colors ${
                track.isMuted 
                  ? 'bg-muted-foreground/50' 
                  : 'bg-primary/70 hover:bg-primary/80'
              }`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}