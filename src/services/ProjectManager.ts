import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface AudioTrack {
  id: string;
  name: string;
  audioData: string; // base64 encoded audio data
  audioBufferData?: {
    sampleRate: number;
    length: number;
    numberOfChannels: number;
    channelData: number[][];
  };
  isPlaying: boolean;
  isMuted: boolean;
  isSolo?: boolean;
  isRecording?: boolean;
  volume: number;
  duration: number;
  startTime?: number; // Time when recording started on timeline
  trimStart?: number; // Trimmed start time within the audio
  trimEnd?: number; // Trimmed end time within the audio
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  tracks: AudioTrack[];
  settings: {
    masterVolume: number;
    tempo: number;
    timeSignature?: { numerator: number; denominator: number };
    metronomeEnabled?: boolean;
    metronomeVolume?: number;
    snapToGrid?: boolean;
    gridSubdivision?: number;
  };
}

class ProjectManagerService {
  private readonly PROJECT_DIR = 'MusicLayers/Projects';
  private readonly AUDIO_DIR = 'MusicLayers/Audio';

  async initialize(): Promise<void> {
    try {
      // Create directories if they don't exist
      await Filesystem.mkdir({
        path: this.PROJECT_DIR,
        directory: Directory.Documents,
        recursive: true
      });
      
      await Filesystem.mkdir({
        path: this.AUDIO_DIR,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (error) {
      console.log('Directories already exist or error creating them:', error);
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      const projectData = JSON.stringify(project, null, 2);
      const fileName = `${project.id}.json`;
      
      await Filesystem.writeFile({
        path: `${this.PROJECT_DIR}/${fileName}`,
        data: projectData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  async loadProject(projectId: string): Promise<Project | null> {
    try {
      const fileName = `${projectId}.json`;
      const result = await Filesystem.readFile({
        path: `${this.PROJECT_DIR}/${fileName}`,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      return JSON.parse(result.data as string);
    } catch (error) {
      console.error('Error loading project:', error);
      return null;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const result = await Filesystem.readdir({
        path: this.PROJECT_DIR,
        directory: Directory.Documents
      });

      const projects: Project[] = [];
      
      for (const file of result.files) {
        if (file.name.endsWith('.json')) {
          const projectId = file.name.replace('.json', '');
          const project = await this.loadProject(projectId);
          if (project) {
            projects.push(project);
          }
        }
      }

      // Sort by last modified (newest first)
      return projects.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      console.error('Error getting all projects:', error);
      return [];
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const fileName = `${projectId}.json`;
      await Filesystem.deleteFile({
        path: `${this.PROJECT_DIR}/${fileName}`,
        directory: Directory.Documents
      });

      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async saveAudioFile(trackId: string, audioData: string): Promise<string> {
    try {
      const fileName = `${trackId}.wav`;
      const filePath = `${this.AUDIO_DIR}/${fileName}`;
      
      await Filesystem.writeFile({
        path: filePath,
        data: audioData,
        directory: Directory.Documents
      });

      return filePath;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw error;
    }
  }

  async exportProjectToFiles(project: Project): Promise<void> {
    try {
      // Create a folder for this project
      const exportDir = `MusicLayers/Exports/${project.name}`;
      await Filesystem.mkdir({
        path: exportDir,
        directory: Directory.Documents,
        recursive: true
      });

      // Save each track as individual audio file
      for (const track of project.tracks) {
        const fileName = `${track.name.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
        await Filesystem.writeFile({
          path: `${exportDir}/${fileName}`,
          data: track.audioData,
          directory: Directory.Documents
        });
      }

      // Save project metadata
      await Filesystem.writeFile({
        path: `${exportDir}/project_info.json`,
        data: JSON.stringify({
          name: project.name,
          createdAt: project.createdAt,
          tracks: project.tracks.map(t => ({ 
            name: t.name, 
            duration: t.duration, 
            volume: t.volume 
          }))
        }, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.error('Error exporting project to files:', error);
      throw error;
    }
  }

  async shareAudioFile(audioData: string, fileName: string): Promise<void> {
    try {
      // Save to temporary location first
      const tempPath = `temp_${fileName}`;
      await Filesystem.writeFile({
        path: tempPath,
        data: audioData,
        directory: Directory.Cache
      });

      // Get the URI for sharing
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: tempPath
      });

      await Share.share({
        title: 'Share Audio',
        text: `Sharing audio: ${fileName}`,
        url: fileUri.uri,
        dialogTitle: 'Share your audio creation'
      });

      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.error('Error sharing audio file:', error);
      throw error;
    }
  }

  // Convert AudioBuffer to base64 for storage
  audioBufferToBase64(audioBuffer: AudioBuffer): string {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    
    let offset = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  // Convert base64 back to AudioBuffer
  async base64ToAudioBuffer(base64Data: string, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
      console.log('Decoding audio data, length:', base64Data.length);
      
      // Handle different data URL formats
      let cleanBase64 = base64Data;
      if (base64Data.includes(',')) {
        cleanBase64 = base64Data.split(',')[1];
      }
      
      console.log('Clean base64 length:', cleanBase64.length);
      
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return await audioContext.decodeAudioData(bytes.buffer);
    } catch (error) {
      console.error('Error decoding audio data:', error);
      throw new Error('Failed to decode audio data');
    }
  }

  // Create a new empty project
  createNewProject(name: string): Project {
    return {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tracks: [],
      settings: {
        masterVolume: 1,
        tempo: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        metronomeEnabled: false,
        metronomeVolume: 0.5,
        snapToGrid: true,
        gridSubdivision: 4
      }
    };
  }
}

export const ProjectManager = new ProjectManagerService();