import { useState, useRef, useCallback, useEffect } from 'react';
import { ProjectManager } from '@/services/ProjectManager';
import { AudioMixer } from '@/components/AudioMixer';
import { PlaybackEngine } from '@/services/PlaybackEngine';
import { ProjectSelector } from '@/components/ProjectSelector';
import { AudioLayer } from '@/components/AudioLayer';
import { DAWTimeline } from '@/components/DAWTimeline';
import { DeviceSelector } from '@/components/DeviceSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Mic, Play, Pause, Square, Upload, Save, Download, FolderOpen, Volume2 } from 'lucide-react';
import { Project, AudioTrack } from '@/services/ProjectManager';

export function RecordingStudio() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [projectName, setProjectName] = useState('New Project');
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initProject = async () => {
      try {
        await ProjectManager.initialize();
        await PlaybackEngine.initialize();
        
        // Set up time update callback
        PlaybackEngine.setOnTimeUpdate(setCurrentTime);
        
        const defaultProject = ProjectManager.createNewProject('My First Project');
        setCurrentProject(defaultProject);
        setProjectName(defaultProject.name);
      } catch (error) {
        console.error('Failed to initialize project:', error);
        toast({
          title: "Error",
          description: "Failed to initialize project manager",
          variant: "destructive",
        });
      }
    };

    initProject();
  }, [toast]);

  useEffect(() => {
    if (currentProject) {
      setTracks(currentProject.tracks);
      setProjectName(currentProject.name);
    }
  }, [currentProject]);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const saveCurrentProject = async () => {
    if (!currentProject) return;

    try {
      const updatedProject: Project = {
        ...currentProject,
        name: projectName,
        lastModified: new Date().toISOString(),
        tracks
      };

      await ProjectManager.saveProject(updatedProject);
      setCurrentProject(updatedProject);
      
      toast({
        title: "Project saved!",
        description: `"${projectName}" has been saved to your device.`,
      });
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Save failed",
        description: "Could not save the project.",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    await startRecordingWithOptions(false);
  };

  const startRecordingWithPlayback = async () => {
    // Seek to the recording start time first
    if (recordingStartTime > 0) {
      PlaybackEngine.seekTo(recordingStartTime);
      setCurrentTime(recordingStartTime);
    }
    await startRecordingWithOptions(true);
  };

  const startRecordingWithOptions = async (withPlayback: boolean) => {
    try {
      // Get user media with selected device
      const constraints: MediaStreamConstraints = { 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } })
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;

      let unmutedTracksCount = 0;

      // Start playing existing tracks if withPlayback is true and tracks exist
      if (withPlayback) {
        const unmutedTracks = tracks.filter(track => !track.isMuted && track.audioData);
        unmutedTracksCount = unmutedTracks.length;
        if (unmutedTracks.length > 0) {
          await PlaybackEngine.playTracks(unmutedTracks, recordingStartTime);
          setIsPlaying(true);
        }
      }

      // Create MediaRecorder with proper options
      const options: MediaRecorderOptions = {};
      
      // Try to use WAV format if supported, fallback to webm
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms for better quality
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: unmutedTracksCount > 0 
          ? `Recording with ${unmutedTracksCount} track(s) playing`
          : "Recording audio...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop playback if it was running during recording
      if (isPlaying) {
        PlaybackEngine.stop();
        setIsPlaying(false);
      }

      // Stop the media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Wait for the recording to be processed
      await new Promise(resolve => {
        mediaRecorderRef.current!.onstop = async () => {
          try {
            // Create blob from recorded chunks
            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
            
            // Convert blob to ArrayBuffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // Initialize audio context if needed
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            // Resume context if suspended
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }
            
            // Decode audio data
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            
            // Convert to WAV format and then to base64
            const wavBuffer = AudioMixer.audioBufferToWav(audioBuffer);
            const base64Data = AudioMixer.arrayBufferToBase64(wavBuffer);
            
            // Add data URL prefix for proper format
            const dataUrl = `data:audio/wav;base64,${base64Data}`;
            
            // Create new track
            const newTrack = {
              id: Date.now().toString(),
              name: recordingName || `Recording ${tracks.length + 1}`,
              audioData: dataUrl,
              isPlaying: false,
              isMuted: false,
              volume: 1,
              duration: audioBuffer.duration,
              startTime: recordingStartTime, // Track when recording started on timeline
            };

            // Add track to current tracks
            const newTracks = [...tracks, newTrack];
            setTracks(newTracks);

            // Auto-save the project
            if (currentProject) {
              const updatedProject = {
                ...currentProject,
                tracks: newTracks,
                lastModified: new Date().toISOString(),
              };
              setCurrentProject(updatedProject);
              await ProjectManager.saveProject(updatedProject);
            }

            setRecordingName('');
            
            toast({
              title: "Recording Saved",
              description: `Track "${newTrack.name}" has been added to your project`,
            });
          } catch (error) {
            console.error('Error processing recording:', error);
            toast({
              title: "Processing Error",
              description: "Failed to process the recording. Please try again.",
              variant: "destructive",
            });
          }
          resolve(undefined);
        };
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await initAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format and then to base64
      const wavBuffer = AudioMixer.audioBufferToWav(audioBuffer);
      const base64Data = AudioMixer.arrayBufferToBase64(wavBuffer);
      const dataUrl = `data:audio/wav;base64,${base64Data}`;
      
      const newTrack: AudioTrack = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        audioData: dataUrl,
        isPlaying: false,
        isMuted: false,
        volume: 1,
        duration: audioBuffer.duration
      };

      const updatedTracks = [...tracks, newTrack];
      setTracks(updatedTracks);
      
      // Auto-save the project
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          tracks: updatedTracks,
          lastModified: new Date().toISOString()
        };
        await ProjectManager.saveProject(updatedProject);
        setCurrentProject(updatedProject);
      }
      
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

    // Reset the input
    event.target.value = '';
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      PlaybackEngine.pause();
      setIsPlaying(false);
    } else {
      const unmutedTracks = tracks.filter(track => !track.isMuted && track.audioData);
      if (unmutedTracks.length > 0) {
        await PlaybackEngine.playTracks(unmutedTracks, currentTime);
        setIsPlaying(true);
      } else {
        toast({
          title: "No tracks to play",
          description: "Add some audio tracks to start playback",
        });
      }
    }
  };

  const stopPlayback = () => {
    PlaybackEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    PlaybackEngine.seekTo(time);
    setCurrentTime(time);
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

    try {
      // Mix all unmuted tracks
      const unmutedTracks = tracks.filter(track => !track.isMuted && track.audioData);
      
      if (unmutedTracks.length === 0) {
        toast({
          title: "Nothing to export",
          description: "All tracks are muted. Please unmute some tracks first.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Mixing tracks...",
        description: "Creating your final audio file.",
      });

      const mixedAudioBuffer = await AudioMixer.mixTracks(unmutedTracks);
      const wavArrayBuffer = AudioMixer.audioBufferToWav(mixedAudioBuffer);
      const audioData = AudioMixer.arrayBufferToBase64(wavArrayBuffer);
      
      // Share using device share functionality
      await ProjectManager.shareAudioFile(audioData, `${projectName}.wav`);
      
      toast({
        title: "Export complete!",
        description: "Your mixed audio is ready to share!",
      });
    } catch (error) {
      console.error('Error exporting project:', error);
      toast({
        title: "Export failed",
        description: "Could not export the project.",
        variant: "destructive",
      });
    }
  };

  const removeTrack = async (trackId: string) => {
    const updatedTracks = tracks.filter(track => track.id !== trackId);
    setTracks(updatedTracks);
    
    // Auto-save the project
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        tracks: updatedTracks,
        lastModified: new Date().toISOString()
      };
      await ProjectManager.saveProject(updatedProject);
      setCurrentProject(updatedProject);
    }
  };

  const toggleTrackMute = async (trackId: string) => {
    const updatedTracks = tracks.map(track => 
      track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
    );
    setTracks(updatedTracks);
    
    // Auto-save the project
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        tracks: updatedTracks,
        lastModified: new Date().toISOString()
      };
      await ProjectManager.saveProject(updatedProject);
      setCurrentProject(updatedProject);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    try {
      setCurrentProject(project);
      setShowProjectSelector(false);
      
      toast({
        title: "Project loaded",
        description: `"${project.name}" is now active.`,
      });
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Error loading project",
        description: "Could not load the selected project.",
        variant: "destructive",
      });
    }
  };

  const handleNewProject = (project: Project) => {
    setCurrentProject(project);
    setShowProjectSelector(false);
  };

  const updateTrackName = async (trackId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedTracks = tracks.map(track => 
      track.id === trackId ? { ...track, name: newName.trim() } : track
    );
    setTracks(updatedTracks);
    
    // Auto-save the project
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        tracks: updatedTracks,
        lastModified: new Date().toISOString()
      };
      await ProjectManager.saveProject(updatedProject);
      setCurrentProject(updatedProject);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            MusicLayers
          </h1>
          <div className="flex items-center justify-center gap-4">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={saveCurrentProject}
              className="text-center text-lg font-semibold max-w-xs"
              placeholder="Project name..."
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProjectSelector(!showProjectSelector)}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Projects
            </Button>
          </div>
        </div>

        {/* Project Selector */}
        {showProjectSelector && (
          <ProjectSelector
            currentProject={currentProject}
            onProjectSelect={handleProjectSelect}
            onNewProject={handleNewProject}
          />
        )}

        {/* Recording Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DeviceSelector
            selectedDeviceId={selectedDeviceId}
            onDeviceChange={setSelectedDeviceId}
          />
          
          <Card className="bg-card border-border">
            <div className="p-4">
              <h3 className="text-base font-semibold mb-3">Recording Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Track Name
                  </label>
                  <Input
                    value={recordingName}
                    onChange={(e) => setRecordingName(e.target.value)}
                    placeholder="Enter track name..."
                    className="w-full"
                  />
                </div>
                {recordingStartTime > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Recording will start at {Math.floor(recordingStartTime / 60)}:{(recordingStartTime % 60).toFixed(1).padStart(4, '0')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Transport Controls */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={isRecording ? "animate-pulse" : ""}
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
                
                {tracks.length > 0 && !isRecording && (
                  <Button
                    variant="secondary"
                    onClick={startRecordingWithPlayback}
                    className="bg-gradient-to-r from-primary to-primary-glow"
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    <Play className="w-4 h-4 mr-2" />
                    Record + Play
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={togglePlayback}
                  disabled={tracks.length === 0}
                  variant={isPlaying ? "secondary" : "default"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                <Button
                  onClick={stopPlayback}
                  disabled={!isPlaying && currentTime === 0}
                  variant="outline"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>

                <Button onClick={saveCurrentProject} variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>

                <Button onClick={exportProject} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm">Master</span>
                <Slider
                  value={[masterVolume]}
                  onValueChange={(value) => {
                    setMasterVolume(value[0]);
                    PlaybackEngine.setMasterVolume(value[0]);
                  }}
                  max={1}
                  step={0.1}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
              
              {(isPlaying || currentTime > 0) && (
                <div className="text-sm text-muted-foreground">
                  Time: {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <DAWTimeline
          tracks={tracks}
          currentTime={currentTime}
          isPlaying={isPlaying}
          recordingStartTime={recordingStartTime}
          onRecordingStartTimeChange={setRecordingStartTime}
          onSeek={handleSeek}
          onToggleTrackMute={toggleTrackMute}
          onToggleTrackSolo={() => {}} // TODO: Implement solo functionality
          onToggleTrackRecord={() => {}} // TODO: Implement track recording
          onTrackVolumeChange={(trackId, volume) => {
            const updatedTracks = tracks.map(track => 
              track.id === trackId ? { ...track, volume } : track
            );
            setTracks(updatedTracks);
          }}
          onRemoveTrack={removeTrack}
          onUpdateTrackName={updateTrackName}
          onTrackUpdate={(trackId, updates) => {
            console.log('Track update called:', trackId, updates);
            
            const updatedTracks = tracks.map(track => {
              if (track.id === trackId) {
                // Preserve the original audio data and other critical properties
                const updatedTrack = { 
                  ...track, 
                  ...updates,
                  // Ensure we don't accidentally overwrite critical data
                  audioData: updates.audioData || track.audioData,
                  duration: updates.duration || track.duration,
                  volume: updates.volume !== undefined ? updates.volume : track.volume
                };
                console.log('Updated track:', updatedTrack);
                return updatedTrack;
              }
              return track;
            });
            
            console.log('All updated tracks:', updatedTracks);
            setTracks(updatedTracks);
            
            // Auto-save the project
            if (currentProject) {
              const updatedProject = {
                ...currentProject,
                tracks: updatedTracks,
                lastModified: new Date().toISOString()
              };
              ProjectManager.saveProject(updatedProject);
              setCurrentProject(updatedProject);
            }
          }}
        />

        {/* Audio Layers */}
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Audio Layers</h3>
            
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
                    onToggleMute={(trackId) => toggleTrackMute(trackId)}
                    onRemove={(trackId) => removeTrack(trackId)}
                    onUpdateTrackName={updateTrackName}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}