import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioLayer } from '@/components/AudioLayer';
import { AudioTrack } from '@/services/ProjectManager';
import { Mic, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TrackListProps {
  tracks: AudioTrack[];
  isPlaying: boolean;
  currentTime: number;
  showAudioLayers: boolean;
  onToggleAudioLayers: (show: boolean) => void;
  onToggleMute: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  onUpdateTrackName: (trackId: string, name: string) => void;
}

export const TrackList = memo(function TrackList({
  tracks,
  isPlaying,
  currentTime,
  showAudioLayers,
  onToggleAudioLayers,
  onToggleMute,
  onRemove,
  onUpdateTrackName,
}: TrackListProps) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audio Layers</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                {showAudioLayers ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onToggleAudioLayers(true)}
                className={showAudioLayers ? "bg-accent" : ""}
              >
                <Eye className="w-4 h-4 mr-2" />
                Show Audio Layers
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onToggleAudioLayers(false)}
                className={!showAudioLayers ? "bg-accent" : ""}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Audio Layers
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {showAudioLayers && (
          <>
            {tracks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audio tracks yet</p>
                <p className="text-sm">Record or upload audio to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tracks.map((track, index) => (
                  <AudioLayer
                    key={track.id}
                    track={track}
                    index={index}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onToggleMute={onToggleMute}
                    onRemove={onRemove}
                    onUpdateTrackName={onUpdateTrackName}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
});
