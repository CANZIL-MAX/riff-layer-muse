import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { DeviceSelector } from '@/components/DeviceSelector';
import { MetronomeControls } from '@/components/MetronomeControls';
import { Volume2 } from 'lucide-react';

interface ProjectSettingsProps {
  masterVolume: number;
  bpm: number;
  isMetronomeEnabled: boolean;
  metronomeVolume: number;
  snapToGrid: boolean;
  showCountIn: boolean;
  latencyCompensation: number;
  selectedDeviceId: string | null;
  onMasterVolumeChange: (volume: number[]) => void;
  onBpmChange: (bpm: number) => void;
  onMetronomeToggle: () => void;
  onMetronomeVolumeChange: (volume: number) => void;
  onSnapToGridChange: (enabled: boolean) => void;
  onShowCountInChange: (enabled: boolean) => void;
  onLatencyCompensationChange: (ms: number) => void;
  onDeviceSelect: (deviceId: string | null) => void;
}

export const ProjectSettings = memo(function ProjectSettings({
  masterVolume,
  bpm,
  isMetronomeEnabled,
  metronomeVolume,
  snapToGrid,
  showCountIn,
  latencyCompensation,
  selectedDeviceId,
  onMasterVolumeChange,
  onBpmChange,
  onMetronomeToggle,
  onMetronomeVolumeChange,
  onSnapToGridChange,
  onShowCountInChange,
  onLatencyCompensationChange,
  onDeviceSelect,
}: ProjectSettingsProps) {
  return (
    <>
      {/* Master Volume */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            <span className="font-medium">Master Volume</span>
            <span className="ml-auto text-sm text-muted-foreground">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
          <Slider
            value={[masterVolume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={onMasterVolumeChange}
          />
        </div>
      </Card>

      {/* Audio Input Device Selector */}
      <DeviceSelector
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={onDeviceSelect}
      />

      {/* Metronome Controls */}
      <MetronomeControls
        bpm={bpm}
        isMetronomeEnabled={isMetronomeEnabled}
        metronomeVolume={metronomeVolume}
        onBpmChange={onBpmChange}
        onMetronomeToggle={onMetronomeToggle}
        onMetronomeVolumeChange={onMetronomeVolumeChange}
      />
    </>
  );
});
