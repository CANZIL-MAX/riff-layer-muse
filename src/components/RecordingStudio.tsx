import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayIcon, PauseIcon, MicIcon, Square, UploadIcon, DownloadIcon } from 'lucide-react';
import { AudioLayer } from './AudioLayer';
import { useToast } from '@/hooks/use-toast';

interface AudioTrack {
  id: string;
  name: string;
  audioBuffer: AudioBuffer;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

export function RecordingStudio() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const startRecording = async () => {
    try {
      await initAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        
        const newTrack: AudioTrack = {
          id: Date.now().toString(),
          name: `Recording ${tracks.length + 1}`,
          audioBuffer,
          isPlaying: false,
          isMuted: false,
          volume: 1,
        };

        setTracks(prev => [...prev, newTrack]);
        setDuration(Math.max(duration, audioBuffer.duration));
        
        toast({
          title: "Recording saved!",
          description: `New track "${newTrack.name}" added to your project.`,
        });
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak or play into your microphone",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
      
      const newTrack: AudioTrack = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        audioBuffer,
        isPlaying: false,
        isMuted: false,
        volume: 1,
      };

      setTracks(prev => [...prev, newTrack]);
      setDuration(Math.max(duration, audioBuffer.duration));
      
      toast({
        title: "File uploaded!",
        description: `"${newTrack.name}" added to your project.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Could not process the audio file.",
        variant: "destructive",
      });
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      // Stop all tracks
      setTracks(prev => prev.map(track => ({ ...track, isPlaying: false })));
    } else {
      setIsPlaying(true);
      // Start all unmuted tracks
      setTracks(prev => prev.map(track => ({ 
        ...track, 
        isPlaying: !track.isMuted 
      })));
    }
  };

  const exportProject = async () => {
    if (tracks.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Please add some audio tracks first.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Exporting project...",
      description: "This may take a moment.",
    });

    // Note: This is a simplified export. In a real app, you'd mix all tracks together
    const firstTrack = tracks[0];
    const blob = new Blob([firstTrack.audioBuffer.getChannelData(0)], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'music-project.wav';
    a.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete!",
      description: "Your project has been downloaded.",
    });
  };

  const removeTrack = (trackId: string) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
  };

  const toggleTrackMute = (trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
    ));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            MusicLayers
          </h1>
          <p className="text-muted-foreground">
            Create, layer, and export your musical ideas
          </p>
        </div>

        {/* Transport Controls */}
        <Card className="p-6 bg-gradient-surface border-border">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? "shadow-recording animate-pulse" : ""}
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <MicIcon className="w-5 h-5 mr-2" />
                  Record
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={togglePlayback}
              disabled={tracks.length === 0}
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Play All
                </>
              )}
            </Button>

            <div className="relative">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="lg">
                <UploadIcon className="w-5 h-5 mr-2" />
                Upload Audio
              </Button>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={exportProject}
              disabled={tracks.length === 0}
            >
              <DownloadIcon className="w-5 h-5 mr-2" />
              Export Project
            </Button>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Audio Layers</h3>
            
            {tracks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MicIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
                    isPlaying={isPlaying && track.isPlaying}
                    onRemove={() => removeTrack(track.id)}
                    onToggleMute={() => toggleTrackMute(track.id)}
                    currentTime={currentTime}
                    duration={duration}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}