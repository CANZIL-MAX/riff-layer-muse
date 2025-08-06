import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrashIcon, VolumeXIcon, Volume2Icon } from 'lucide-react';
import { WaveformDisplay } from './WaveformDisplay';

interface AudioTrack {
  id: string;
  name: string;
  audioBuffer: AudioBuffer;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

interface AudioLayerProps {
  track: AudioTrack;
  index: number;
  isPlaying: boolean;
  onRemove: () => void;
  onToggleMute: () => void;
  currentTime: number;
  duration: number;
}

export function AudioLayer({ 
  track, 
  index, 
  isPlaying, 
  onRemove, 
  onToggleMute,
  currentTime,
  duration 
}: AudioLayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-layer-bg border-border shadow-layer overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {index + 1}
            </div>
            <div>
              <h4 className="font-medium text-card-foreground">{track.name}</h4>
              <p className="text-xs text-muted-foreground">
                {track.audioBuffer.duration.toFixed(1)}s
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              className={track.isMuted ? "text-destructive" : "text-muted-foreground"}
            >
              {track.isMuted ? (
                <VolumeXIcon className="w-4 h-4" />
              ) : (
                <Volume2Icon className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Waveform */}
        <div 
          className="h-16 bg-timeline rounded-lg overflow-hidden cursor-pointer border border-border"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <WaveformDisplay
            audioBuffer={track.audioBuffer}
            isPlaying={isPlaying && !track.isMuted}
            isMuted={track.isMuted}
            currentTime={currentTime}
            height={64}
          />
        </div>

        {/* Recording indicator when playing */}
        {isPlaying && !track.isMuted && (
          <div className="mt-2 flex items-center gap-2 text-playing text-sm">
            <div className="w-2 h-2 bg-playing rounded-full animate-pulse" />
            Playing
          </div>
        )}

        {track.isMuted && (
          <div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-2 h-2 bg-muted-foreground rounded-full opacity-50" />
            Muted
          </div>
        )}
      </div>
    </Card>
  );
}