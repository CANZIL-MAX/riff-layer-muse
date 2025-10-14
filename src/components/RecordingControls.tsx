import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mic, Play, Pause, Square, Upload, Save, Download, FolderOpen } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPlaying: boolean;
  recordingName: string;
  projectName: string;
  isNative: boolean;
  onRecordingNameChange: (name: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onUpload: () => void;
  onSave: () => void;
  onExport: () => void;
  onOpenProject: () => void;
}

export const RecordingControls = memo(function RecordingControls({
  isRecording,
  isPlaying,
  recordingName,
  projectName,
  isNative,
  onRecordingNameChange,
  onStartRecording,
  onStopRecording,
  onPlay,
  onPause,
  onStop,
  onUpload,
  onSave,
  onExport,
  onOpenProject,
}: RecordingControlsProps) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold flex-1">{projectName}</h2>
        </div>
        
        {/* Recording Input */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Track name..."
            value={recordingName}
            onChange={(e) => onRecordingNameChange(e.target.value)}
            className="flex-1"
            disabled={isRecording}
          />
          <Button
            onClick={isRecording ? onStopRecording : onStartRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            disabled={isPlaying}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Record
              </>
            )}
          </Button>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onPlay}
            disabled={isPlaying || isRecording}
            variant="secondary"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
          <Button
            onClick={onPause}
            disabled={!isPlaying || isRecording}
            variant="secondary"
            size="lg"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button
            onClick={onStop}
            disabled={!isPlaying || isRecording}
            variant="secondary"
            size="lg"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Project Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={onUpload} variant="outline" disabled={isRecording || isPlaying}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button onClick={onSave} variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button onClick={onExport} variant="outline" disabled={isRecording || isPlaying}>
            <Download className="w-4 h-4 mr-2" />
            {isNative ? 'Share' : 'Export'}
          </Button>
          <Button onClick={onOpenProject} variant="outline" disabled={isRecording || isPlaying}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Projects
          </Button>
        </div>
      </div>
    </Card>
  );
});
