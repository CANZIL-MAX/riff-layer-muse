import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SafeProjectManager as ProjectManager } from '@/services/SafeProjectManager';
import { AudioMixer } from '@/components/AudioMixer';
import { PlaybackEngine } from '@/services/PlaybackEngine';
import { MetronomeEngine } from '@/services/MetronomeService';
import { ProjectSelector } from '@/components/ProjectSelector';
import { AudioLayer } from '@/components/AudioLayer';
import { DAWTimeline } from '@/components/DAWTimeline';
import { DeviceSelector } from '@/components/DeviceSelector';
import { MetronomeControls } from '@/components/MetronomeControls';
import { NativeExportDialog } from '@/components/NativeExportDialog';
import { useNativePlatform } from '@/hooks/useNativePlatform';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Mic, Play, Pause, Square, Upload, Save, Download, FolderOpen, Volume2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project, AudioTrack } from '@/services/ProjectManager';
import { SimpleFallback } from '@/components/SimpleFallback';


export function RecordingStudio() {
  console.log('RecordingStudio component initializing...');
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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
  
  // Metronome and timing states
  const [bpm, setBpm] = useState(120);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(0.5);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showCountIn, setShowCountIn] = useState(true);
  const [showAudioLayers, setShowAudioLayers] = useState(true);
  const [latencyCompensation, setLatencyCompensation] = useState(0);
  const [soloTracks, setSoloTracks] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { isNative } = useNativePlatform();

  // State to store scrollToTime function from DAWTimeline
  const [scrollToTimeFunction, setScrollToTimeFunction] = useState<((time: number) => void) | null>(null);

  // Memoize track callbacks to prevent unnecessary re-renders
  const memoizedCallbacks = useMemo(() => ({
    toggleTrackMute: async (trackId: string) => {
      const updatedTracks = tracks.map(track => 
        track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
      );
      setTracks(updatedTracks);
      
      // If currently playing, restart playback immediately to apply mute changes
      if (isPlaying) {
        const wasPlayingTime = currentTime;
        PlaybackEngine.stop();
        
        // Calculate new playable tracks with updated mute state
        const newPlayableTracks = soloTracks.size > 0 
          ? updatedTracks.filter(track => soloTracks.has(track.id) && track.audioData)
          : updatedTracks.filter(track => !track.isMuted && track.audioData);
        
        if (newPlayableTracks.length > 0) {
          await PlaybackEngine.playTracks(newPlayableTracks, wasPlayingTime);
        }
      }
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          tracks: updatedTracks,
          lastModified: new Date().toISOString()
        };
        await ProjectManager.saveProject(updatedProject);
        setCurrentProject(updatedProject);
      }
    },

    toggleTrackSolo: async (trackId: string) => {
      const newSoloTracks = new Set(soloTracks);
      if (newSoloTracks.has(trackId)) {
        newSoloTracks.delete(trackId);
      } else {
        newSoloTracks.add(trackId);
      }
      setSoloTracks(newSoloTracks);
      
      // If currently playing, restart playback immediately to apply solo changes
      if (isPlaying) {
        const wasPlayingTime = currentTime;
        PlaybackEngine.stop();
        
        // Calculate new playable tracks with updated solo state
        const newPlayableTracks = newSoloTracks.size > 0 
          ? tracks.filter(track => newSoloTracks.has(track.id) && track.audioData)
          : tracks.filter(track => !track.isMuted && track.audioData);
        
        if (newPlayableTracks.length > 0) {
          await PlaybackEngine.playTracks(newPlayableTracks, wasPlayingTime);
        }
      }
    },

    updateTrackName: async (trackId: string, newName: string) => {
      if (!newName.trim()) return;
      
      const updatedTracks = tracks.map(track => 
        track.id === trackId ? { ...track, name: newName.trim() } : track
      );
      setTracks(updatedTracks);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          tracks: updatedTracks,
          lastModified: new Date().toISOString()
        };
        await ProjectManager.saveProject(updatedProject);
        setCurrentProject(updatedProject);
      }
    },

    removeTrack: async (trackId: string) => {
      const updatedTracks = tracks.filter(track => track.id !== trackId);
      setTracks(updatedTracks);
      
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          tracks: updatedTracks,
          lastModified: new Date().toISOString()
        };
        await ProjectManager.saveProject(updatedProject);
        setCurrentProject(updatedProject);
      }
    }
  }), [tracks, currentProject, soloTracks]);

  // Memoize playable tracks based on mute/solo state
  const playableTracks = useMemo(() => {
    if (soloTracks.size > 0) {
      // If any tracks are soloed, only play soloed tracks
      return tracks.filter(track => soloTracks.has(track.id) && track.audioData);
    } else {
      // Otherwise, play all non-muted tracks
      return tracks.filter(track => !track.isMuted && track.audioData);
    }
  }, [tracks, soloTracks]);

  useEffect(() => {
    const initProject = async () => {
      console.log('🚀 Starting RecordingStudio initialization...');
      
      const initTimeout = setTimeout(() => {
        console.error('⏰ Initialization timeout - setting fallback state');
        setInitError('Initialization timeout');
        setIsInitialized(true);
      }, 10000); // 10 second timeout
      
      try {
        // Initialize services with error boundaries
        console.log('📦 Initializing ProjectManager...');
        try {
          await ProjectManager.initialize();
          console.log('✅ ProjectManager initialized successfully');
        } catch (pmError) {
          console.warn('⚠️ ProjectManager initialization failed:', pmError);
          // Continue anyway as it might work in fallback mode
        }
        
        console.log('🎵 Initializing PlaybackEngine...');
        try {
          await PlaybackEngine.initialize();
          console.log('✅ PlaybackEngine initialized successfully');
          
          // Set up time update callback
          PlaybackEngine.setOnTimeUpdate(setCurrentTime);
        } catch (peError) {
          console.warn('⚠️ PlaybackEngine initialization failed:', peError);
          // Continue anyway
        }
        
        console.log('🥁 Initializing MetronomeEngine...');
        try {
          await MetronomeEngine.initialize();
          console.log('✅ MetronomeEngine initialized successfully');
        } catch (meError) {
          console.warn('⚠️ MetronomeEngine initialization failed:', meError);
          // Continue anyway
        }
        
        // Create default project
        console.log('📝 Creating default project...');
        const defaultProject = ProjectManager.createNewProject('My First Project');
        console.log('✅ Default project created:', defaultProject.name);
        
        setCurrentProject(defaultProject);
        setProjectName(defaultProject.name);
        
        // Load project settings safely
        if (defaultProject.settings) {
          setBpm(defaultProject.settings.tempo || 120);
          setIsMetronomeEnabled(defaultProject.settings.metronomeEnabled || false);
          setMetronomeVolume(defaultProject.settings.metronomeVolume || 0.5);
          setSnapToGrid(defaultProject.settings.snapToGrid !== false);
        }
        
        clearTimeout(initTimeout);
        console.log('🎉 RecordingStudio initialization completed successfully');
        setIsInitialized(true);
        
      } catch (error) {
        clearTimeout(initTimeout);
        console.error('❌ RecordingStudio initialization failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.log('🔄 Attempting fallback initialization...');
        
        // Try to create a minimal fallback project
        try {
          const fallbackProject = ProjectManager.createNewProject('Fallback Project');
          setCurrentProject(fallbackProject);
          setProjectName(fallbackProject.name);
          setIsInitialized(true);
          setInitError(`Limited mode: ${errorMessage}`);
          
          console.log('✅ Fallback project created successfully');
          
          toast({
            title: "Limited Mode Active",
            description: "Some features may be unavailable. App is running in fallback mode.",
            variant: "destructive",
          });
          
        } catch (fallbackError) {
          console.error('❌ Complete initialization failure:', fallbackError);
          setInitError('Complete initialization failure - please refresh the page');
          setIsInitialized(true); // Still set to true to show error UI
        }
      }
    };

    // Add a small delay to ensure DOM is ready
    const startTimeout = setTimeout(initProject, 100);
    
    return () => {
      clearTimeout(startTimeout);
    };
  }, [toast]);

  useEffect(() => {
    if (currentProject && currentProject.id !== currentProjectId) {
      // Only load settings when actually switching to a different project
      setCurrentProjectId(currentProject.id);
      setTracks(currentProject.tracks);
      setProjectName(currentProject.name);
      
      // Load project settings only when switching projects
      if (currentProject.settings) {
        setBpm(currentProject.settings.tempo || 120);
        setIsMetronomeEnabled(currentProject.settings.metronomeEnabled || false);
        setMetronomeVolume(currentProject.settings.metronomeVolume || 0.5);
        setSnapToGrid(currentProject.settings.snapToGrid !== false);
      }
    } else if (currentProject && currentProject.id === currentProjectId) {
      // Just update tracks and name, keep current settings
      setTracks(currentProject.tracks);
      setProjectName(currentProject.name);
    }
  }, [currentProject, currentProjectId]);

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
        tracks,
        settings: {
          ...currentProject.settings,
          tempo: bpm,
          metronomeEnabled: isMetronomeEnabled,
          metronomeVolume: metronomeVolume,
          snapToGrid: snapToGrid,
        }
      };

      await ProjectManager.saveProject(updatedProject);
      // Update the project but keep the same ID to prevent settings reset
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
      // Set recording start time to current timeline position
      setRecordingStartTime(currentTime);
      
      // Play count-in if enabled
      if (showCountIn && isMetronomeEnabled) {
        toast({
          title: "Count-in starting...",
          description: "Recording will begin after count-in",
        });
        await MetronomeEngine.playCountIn(1);
      }
      
      // Enhanced latency detection and compensation
      const audioContext = audioContextRef.current || new AudioContext();
      const baseLatency = audioContext.baseLatency || 0;
      const outputLatency = (audioContext as any).outputLatency || 0;
      
      // Detect device-specific latency
      let deviceLatency = 0;
      const deviceName = selectedDeviceId?.toLowerCase() || '';
      
      if (deviceName.includes('airpods') || deviceName.includes('bluetooth')) {
        deviceLatency = 0.15; // AirPods typical latency
      } else if (deviceName.includes('usb') || deviceName.includes('interface')) {
        deviceLatency = 0.005; // USB audio interface
      } else {
        deviceLatency = 0.02; // Built-in microphone
      }
      
      // Calculate total latency with buffer analysis compensation
      const totalSystemLatency = baseLatency + outputLatency + deviceLatency;
      
      // Add processing buffer compensation (iOS Safari specific)
      const processingBufferLatency = 0.02;
      const compensatedLatency = totalSystemLatency + processingBufferLatency;
      
      setLatencyCompensation(compensatedLatency);
      
      console.log('🎯 Advanced latency compensation:', {
        baseLatency,
        outputLatency, 
        deviceLatency,
        processingBufferLatency,
        totalCompensation: compensatedLatency
      });

      // Get user media with selected device and optimized settings for iOS
      const constraints: MediaStreamConstraints = { 
        audio: {
          echoCancellation: false, // Disable for better latency
          noiseSuppression: false, // Disable for better latency  
          autoGainControl: false, // Disable for better latency
          sampleRate: 44100,
          channelCount: 1, // Mono for better performance
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } })
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;

      let unmutedTracksCount = 0;

      // Start metronome if enabled
      if (isMetronomeEnabled) {
        await MetronomeEngine.start();
      }
      
      // Start playing existing tracks if withPlayback is true and tracks exist
      if (withPlayback) {
        unmutedTracksCount = playableTracks.length;
        if (playableTracks.length > 0) {
          // Play at full volume, no ducking during recording
          await PlaybackEngine.playTracks(playableTracks, currentTime);
          setIsPlaying(true);
        }
      }

      // Create MediaRecorder with proper options for iOS
      const options: MediaRecorderOptions = {};
      
      // Prefer MP4 for iOS/iPhone, then fallback to other formats
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
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

      // Stop metronome
      MetronomeEngine.stop();
      
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
            
            // Create new track with latency compensation
            const compensatedStartTime = Math.max(0, recordingStartTime - latencyCompensation);
            
            const newTrack = {
              id: Date.now().toString(),
              name: recordingName || `Recording ${tracks.length + 1}`,
              audioData: dataUrl,
              isPlaying: false,
              isMuted: false,
              volume: 1,
              duration: audioBuffer.duration,
              startTime: compensatedStartTime, // Apply latency compensation
              trimStart: 0,
              trimEnd: audioBuffer.duration
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

    // File validation
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedExtensions = ['.wav', '.mp3', '.aiff', '.m4a', '.ogg'];
    const allowedMimeTypes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mp3', 'audio/mpeg', 'audio/mp4',
      'audio/aiff', 'audio/x-aiff',
      'audio/m4a', 'audio/ogg'
    ];

    console.log('File upload started:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    // Check file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `File size must be under 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Check file extension
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Unsupported file type",
        description: `Please upload WAV, MP3, AIFF, M4A, or OGG files. Found: ${fileExtension}`,
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Check MIME type if available
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      console.warn('MIME type not in allowed list:', file.type);
    }

    try {
      // Show loading toast
      const loadingToast = toast({
        title: "Processing audio file...",
        description: `Processing "${file.name}"`,
      });

      await initAudioContext();
      
      console.log('Reading file as array buffer...');
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('Decoding audio data...', {
        bufferSize: arrayBuffer.byteLength,
        audioContextState: audioContextRef.current?.state
      });
      
      const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer.slice(0));
      
      console.log('Audio decoded successfully:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
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
        title: "File uploaded successfully!",
        description: `"${newTrack.name}" (${audioBuffer.duration.toFixed(1)}s) added to your project.`,
      });
      
      console.log('File upload completed successfully');
      
    } catch (error) {
      console.error('Detailed error uploading file:', {
        error,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = "Could not process the audio file.";
      
      if (error instanceof Error) {
        if (error.message.includes('Unable to decode audio data')) {
          errorMessage = "Audio format not supported or file is corrupted.";
        } else if (error.message.includes('quota')) {
          errorMessage = "Not enough storage space available.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error occurred during upload.";
        } else if (error.name === 'EncodingError') {
          errorMessage = "Audio file encoding is not supported.";
        }
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    }

    // Reset the input
    event.target.value = '';
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      PlaybackEngine.pause();
      MetronomeEngine.stop();
      setIsPlaying(false);
    } else {
      if (playableTracks.length > 0) {
        if (isMetronomeEnabled) {
          await MetronomeEngine.start();
        }
        await PlaybackEngine.playTracks(playableTracks, currentTime);
        setIsPlaying(true);
      } else {
        toast({
          title: "No tracks to play",
          description: "Add some audio tracks to start playback",
        });
      }
    }
  };

  const stopPlayback = (scrollToTimeFunction?: (time: number) => void) => {
    PlaybackEngine.stop();
    MetronomeEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Scroll timeline back to the start
    if (scrollToTimeFunction) {
      scrollToTimeFunction(0);
    }
  };

  const handleSeek = (time: number) => {
    PlaybackEngine.seekTo(time);
    setCurrentTime(time);
  };

  const handleNativeExport = async (options: { filename: string; format: string; quality: string }) => {
    if (!isNative) {
      await exportProject();
      return;
    }

    try {
      console.log('🚀 Starting native project export with options:', options);
      
      if (!currentProject || currentProject.tracks.length === 0) {
        throw new Error("No tracks to export");
      }

      const validTracks = currentProject.tracks.filter(track => track.audioData && track.audioData.length > 0);
      if (validTracks.length === 0) {
        throw new Error("No tracks contain audio data");
      }

      console.log(`📊 Exporting ${validTracks.length} tracks to native Files app`);

      const mixedBuffer = await AudioMixer.mixTracks(validTracks);
      if (!mixedBuffer || mixedBuffer.length === 0) {
        throw new Error('Mixed audio buffer is empty');
      }
      
      const wavData = AudioMixer.audioBufferToWav(mixedBuffer);
      const base64Audio = AudioMixer.arrayBufferToBase64(wavData);
      
      const fileName = `${options.filename.replace(/\s+/g, '_')}.${options.format}`;
      
      // Use the Capacitor Share API for native file export
      const { Capacitor } = await import('@capacitor/core');
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      
      if (Capacitor.isNativePlatform()) {
        // Save file to app documents directory
        const result = await Filesystem.writeFile({
          path: `exports/${fileName}`,
          data: base64Audio,
          directory: Directory.Documents
        });
        
        // Get the file URI
        const fileUri = await Filesystem.getUri({
          path: `exports/${fileName}`,
          directory: Directory.Documents
        });
        
        console.log('📁 File saved to Documents:', fileUri.uri);
        
        // Share the file using iOS Files app
        await Share.share({
          url: fileUri.uri,
          title: fileName,
          dialogTitle: 'Save to Files'
        });
        
        console.log('✅ Native file export completed - user can access via Files app');
      } else {
        // Fallback to web export
        await exportProject();
      }
    } catch (error) {
      console.error('❌ Native export failed:', error);
      throw error;
    }
  };

  const exportProject = async () => {
    if (isNative) {
      setShowExportDialog(true);
      return;
    }

    try {
      console.log('🚀 Starting project export...');
      
      if (!currentProject || currentProject.tracks.length === 0) {
        toast({
          title: "Export Error",
          description: "No tracks to export",
          variant: "destructive"
        });
        return;
      }

      // Validate tracks have audio data
      const validTracks = currentProject.tracks.filter(track => track.audioData && track.audioData.length > 0);
      if (validTracks.length === 0) {
        toast({
          title: "Export Error",
          description: "No tracks contain audio data",
          variant: "destructive"
        });
        return;
      }

      console.log(`📊 Exporting ${validTracks.length} of ${currentProject.tracks.length} tracks`);

      // Mix all tracks with enhanced error handling
      const mixedBuffer = await AudioMixer.mixTracks(validTracks);
      
      if (!mixedBuffer || mixedBuffer.length === 0) {
        throw new Error('Mixed audio buffer is empty');
      }
      
      console.log(`🎵 Mixed buffer: ${mixedBuffer.duration}s, ${mixedBuffer.numberOfChannels} channels`);
      
      // Convert to WAV with validation
      const wavData = AudioMixer.audioBufferToWav(mixedBuffer);
      if (!wavData || wavData.byteLength === 0) {
        throw new Error('WAV conversion failed');
      }
      
      const base64Audio = AudioMixer.arrayBufferToBase64(wavData);
      if (!base64Audio || base64Audio.length === 0) {
        throw new Error('Base64 conversion failed');
      }
      
      console.log(`📦 WAV data size: ${wavData.byteLength} bytes, Base64 size: ${base64Audio.length} chars`);
      
      // Share the file
      const fileName = `${currentProject.name.replace(/\s+/g, '_')}_export.wav`;
      
      try {
        await ProjectManager.shareAudioFile(base64Audio, fileName);
        
        toast({
          title: "Export Successful",
          description: `${fileName} has been exported successfully`,
        });
      } catch (shareError) {
        // If user cancels the share dialog, don't show error message
        if (shareError instanceof Error && shareError.message.includes('cancelled')) {
          return; // Silent return for cancellation
        }
        
        // For other errors, show error message
        throw shareError;
      }
      
      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
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



  // Show fallback while initializing or if there's an error
  if (!isInitialized) {
    return (
      <SimpleFallback 
        error={initError} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

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

        {/* Recording Setup and Metronome */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          
          <MetronomeControls
            bpm={bpm}
            onBpmChange={setBpm}
            isMetronomeEnabled={isMetronomeEnabled}
            onMetronomeToggle={() => setIsMetronomeEnabled(!isMetronomeEnabled)}
            metronomeVolume={metronomeVolume}
            onMetronomeVolumeChange={setMetronomeVolume}
          />
        </div>

        {/* Transport Controls */}
        <Card className="p-4 lg:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${isRecording ? "animate-pulse" : ""} min-h-[48px] w-full sm:w-auto touch-manipulation`}
                  size="lg"
                >
                  {isRecording ? (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Record
                    </>
                  )}
                </Button>
                
                {tracks.length > 0 && !isRecording && (
                  <Button
                    variant="secondary"
                    onClick={startRecordingWithPlayback}
                    className="bg-gradient-to-r from-primary to-primary-glow min-h-[48px] w-full sm:w-auto touch-manipulation"
                    size="lg"
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    <Play className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Record + Play</span>
                    <span className="sm:hidden">Rec+Play</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={togglePlayback}
                  disabled={tracks.length === 0}
                  variant={isPlaying ? "secondary" : "default"}
                  className="min-h-[48px] touch-manipulation"
                  size="lg"
                >
                  {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                <Button
                  onClick={() => stopPlayback(scrollToTimeFunction)}
                  disabled={!isPlaying && currentTime === 0}
                  variant="outline"
                  className="min-h-[48px] touch-manipulation"
                  size="lg"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept="audio/wav,audio/mp3,audio/mpeg,audio/aiff,audio/x-aiff,audio/m4a,audio/ogg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Upload WAV, MP3, AIFF, M4A, or OGG audio files (max 50MB)"
                  />
                  <Button variant="outline" className="min-h-[48px] touch-manipulation w-full" size="lg">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </Button>
                </div>

                <Button onClick={saveCurrentProject} variant="outline" className="min-h-[48px] touch-manipulation" size="lg">
                  <Save className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Save</span>
                </Button>

                <Button onClick={exportProject} variant="outline" className="min-h-[48px] touch-manipulation" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Export</span>
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
          isRecording={isRecording}
          recordingStartTime={recordingStartTime}
          onRecordingStartTimeChange={setRecordingStartTime}
          onSeek={handleSeek}
          onToggleTrackMute={memoizedCallbacks.toggleTrackMute}
          onToggleTrackSolo={memoizedCallbacks.toggleTrackSolo}
          onToggleTrackRecord={() => {}} // TODO: Implement track recording
          onTrackVolumeChange={(trackId, volume) => {
            const updatedTracks = tracks.map(track => 
              track.id === trackId ? { ...track, volume } : track
            );
            setTracks(updatedTracks);
          }}
          onRemoveTrack={memoizedCallbacks.removeTrack}
          onUpdateTrackName={memoizedCallbacks.updateTrackName}
          bpm={bpm}
          snapToGrid={snapToGrid}
          onScrollToTime={setScrollToTimeFunction}
          soloTracks={soloTracks}
          onTrackUpdate={async (trackId, updates) => {
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
            
            // If we're currently playing, restart playback with new positions
            if (isPlaying) {
              console.log('Restarting playback due to track update');
              PlaybackEngine.stop();
              const newPlayableTracks = soloTracks.size > 0 
                ? updatedTracks.filter(track => soloTracks.has(track.id) && track.audioData)
                : updatedTracks.filter(track => !track.isMuted && track.audioData);
              if (newPlayableTracks.length > 0) {
                await PlaybackEngine.playTracks(newPlayableTracks, currentTime);
              }
            }
            
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
                    onClick={() => setShowAudioLayers(true)}
                    className={showAudioLayers ? "bg-accent" : ""}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Show Audio Layers
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowAudioLayers(false)}
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
                        onToggleMute={memoizedCallbacks.toggleTrackMute}
                        onRemove={memoizedCallbacks.removeTrack}
                        onUpdateTrackName={memoizedCallbacks.updateTrackName}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Native Export Dialog */}
        {isNative && (
          <NativeExportDialog
            isOpen={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            onExport={handleNativeExport}
            projectName={projectName}
          />
        )}
      </div>
      <Toaster />
    </div>
  );
}