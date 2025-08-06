import { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayIcon, PauseIcon, MicIcon, Square, UploadIcon, DownloadIcon, SaveIcon, ShareIcon, FolderIcon } from 'lucide-react';
import { AudioLayer } from './AudioLayer';
import { ProjectSelector } from './ProjectSelector';
import { useToast } from '@/hooks/use-toast';
import { Project, AudioTrack, ProjectManager } from '@/services/ProjectManager';
import { AudioMixer } from '@/components/AudioMixer';

export function RecordingStudio() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Initialize with a default project
  useEffect(() => {
    if (!currentProject) {
      const defaultProject = ProjectManager.createNewProject('Untitled Project');
      setCurrentProject(defaultProject);
      setProjectName(defaultProject.name);
    }
  }, [currentProject]);

  // Update tracks when project changes
  useEffect(() => {
    if (currentProject) {
      setTracks(currentProject.tracks);
      setProjectName(currentProject.name);
      setDuration(Math.max(...currentProject.tracks.map(t => t.duration), 0));
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
        
        // Convert to base64 for storage
        const audioData = ProjectManager.audioBufferToBase64(audioBuffer);
        
        const newTrack: AudioTrack = {
          id: Date.now().toString(),
          name: `Recording ${tracks.length + 1}`,
          audioData,
          isPlaying: false,
          isMuted: false,
          volume: 1,
          duration: audioBuffer.duration
        };

        const updatedTracks = [...tracks, newTrack];
        setTracks(updatedTracks);
        setDuration(Math.max(duration, audioBuffer.duration));
        
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
      
      // Convert to base64 for storage
      const audioData = ProjectManager.audioBufferToBase64(audioBuffer);
      
      const newTrack: AudioTrack = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        audioData,
        isPlaying: false,
        isMuted: false,
        volume: 1,
        duration: audioBuffer.duration
      };

      const updatedTracks = [...tracks, newTrack];
      setTracks(updatedTracks);
      setDuration(Math.max(duration, audioBuffer.duration));
      
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

    setIsExporting(true);
    
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
      
      // Share using iOS share sheet
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
    } finally {
      setIsExporting(false);
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
      // Load the selected project
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
              <FolderIcon className="w-4 h-4 mr-2" />
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
              onClick={saveCurrentProject}
              disabled={!currentProject}
            >
              <SaveIcon className="w-5 h-5 mr-2" />
              Save
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={exportProject}
              disabled={tracks.length === 0 || isExporting}
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <ShareIcon className="w-5 h-5 mr-2" />
                  Share
                </>
              )}
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