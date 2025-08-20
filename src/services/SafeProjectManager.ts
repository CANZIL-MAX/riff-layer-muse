// ESM imports with fallbacks for better mobile support
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

let isCapacitorAvailable = false;
let FilesystemAPI: any = null;
let DirectoryAPI: any = null;

try {
  // Check if Capacitor is available and native
  if (Capacitor && Capacitor.isNativePlatform()) {
    FilesystemAPI = Filesystem;
    DirectoryAPI = Directory;
    isCapacitorAvailable = true;
    console.log('✅ Capacitor native filesystem available');
  } else {
    console.log('🌐 Running in web mode');
  }
} catch (error) {
  console.warn('⚠️ Capacitor not available:', error);
  isCapacitorAvailable = false;
}

import { Project, AudioTrack } from './ProjectManager';

class SafeProjectManagerService {
  private isCapacitorAvailable = isCapacitorAvailable;
  private isInitialized = false;
  private memoryProjects: Map<string, Project> = new Map();

  async initialize() {
    console.log('🚀 SafeProjectManager initializing...');
    
    try {
      this.isCapacitorAvailable = isCapacitorAvailable;
      console.log('📱 Native platform detected:', this.isCapacitorAvailable);

      if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
        try {
          console.log('📁 Setting up native filesystem...');
          
          // Try to create directories
          await FilesystemAPI.mkdir({
            path: 'riff-layer-muse',
            directory: DirectoryAPI.Documents,
            recursive: true
          });
          
          await FilesystemAPI.mkdir({
            path: 'riff-layer-muse/projects',
            directory: DirectoryAPI.Documents,
            recursive: true
          });
          
          console.log('✅ Capacitor filesystem initialized successfully');
        } catch (error: any) {
          console.warn('⚠️ Filesystem initialization failed, using memory:', error.message);
          this.isCapacitorAvailable = false;
        }
      } else {
        console.log('💾 Using memory storage mode');
        this.isCapacitorAvailable = false;
      }

      this.isInitialized = true;
      console.log('✅ SafeProjectManager initialized with storage mode:', this.isCapacitorAvailable ? 'native' : 'memory');
      
    } catch (error) {
      console.error('❌ SafeProjectManager initialization error:', error);
      this.isCapacitorAvailable = false;
      this.isInitialized = true;
      console.log('🔄 Continuing with memory-only storage');
    }
  }

  createNewProject(name: string): Project {
    const project: Project = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tracks: [],
      settings: {
        masterVolume: 1,
        tempo: 120,
        metronomeEnabled: false,
        metronomeVolume: 0.5,
        snapToGrid: true,
      }
    };

    // Store in memory immediately
    this.memoryProjects.set(project.id, project);
    console.log('Created new project:', project.name, 'Storage:', this.isCapacitorAvailable ? 'native' : 'memory');
    
    return project;
  }

  async saveProject(project: Project): Promise<void> {
    console.log('Saving project:', project.name, 'Storage mode:', this.isCapacitorAvailable ? 'native' : 'memory');
    
    // Always save to memory first
    this.memoryProjects.set(project.id, { ...project });

    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
      try {
        const projectData = JSON.stringify(project, null, 2);
        await FilesystemAPI.writeFile({
          path: `riff-layer-muse/projects/${project.id}.json`,
          data: projectData,
          directory: DirectoryAPI.Documents,
          encoding: 'utf8' as any
        });
        console.log('Project saved to filesystem successfully');
      } catch (error) {
        console.warn('Failed to save to filesystem, kept in memory:', error);
      }
    }
  }

  async loadProject(projectId: string): Promise<Project> {
    console.log('Loading project:', projectId);
    
    // Try memory first
    const memoryProject = this.memoryProjects.get(projectId);
    if (memoryProject) {
      console.log('Loaded project from memory');
      return memoryProject;
    }

    // Try filesystem if available
    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
      try {
        const result = await FilesystemAPI.readFile({
          path: `riff-layer-muse/projects/${projectId}.json`,
          directory: DirectoryAPI.Documents,
          encoding: 'utf8' as any
        });
        
        const project = JSON.parse(result.data as string);
        this.memoryProjects.set(projectId, project);
        console.log('Loaded project from filesystem');
        return project;
      } catch (error) {
        console.warn('Failed to load from filesystem:', error);
      }
    }

    throw new Error(`Project ${projectId} not found`);
  }

  async getAllProjects(): Promise<Project[]> {
    console.log('Getting all projects, storage mode:', this.isCapacitorAvailable ? 'native' : 'memory');
    
    const projects: Project[] = [];
    
    // Get from memory
    projects.push(...Array.from(this.memoryProjects.values()));

    // Try to get from filesystem if available and we don't have any in memory
    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI && projects.length === 0) {
      try {
        const result = await FilesystemAPI.readdir({
          path: 'riff-layer-muse/projects',
          directory: DirectoryAPI.Documents
        });

        for (const file of result.files) {
          if (file.name.endsWith('.json')) {
            try {
              const projectData = await FilesystemAPI.readFile({
                path: `riff-layer-muse/projects/${file.name}`,
                directory: DirectoryAPI.Documents,
                encoding: 'utf8' as any
              });
              
              const project = JSON.parse(projectData.data as string);
              projects.push(project);
              this.memoryProjects.set(project.id, project);
            } catch (error) {
              console.warn(`Failed to load project ${file.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read projects directory:', error);
      }
    }

    return projects.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  async deleteProject(projectId: string): Promise<void> {
    console.log('Deleting project:', projectId);
    
    // Remove from memory
    this.memoryProjects.delete(projectId);

    // Try to remove from filesystem
    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
      try {
        await FilesystemAPI.deleteFile({
          path: `riff-layer-muse/projects/${projectId}.json`,
          directory: DirectoryAPI.Documents
        });
        console.log('Project deleted from filesystem');
      } catch (error) {
        console.warn('Failed to delete from filesystem:', error);
      }
    }
  }

  async shareAudioFile(audioData: string, fileName: string): Promise<void> {
    try {
      console.log('🎵 Attempting to share audio file:', fileName);
      console.log('📊 Audio data length:', audioData?.length || 0);
      
      if (!audioData) {
        throw new Error('No audio data provided for export');
      }

      // Handle different audio data formats
      let processedData: string;
      if (audioData.startsWith('data:')) {
        processedData = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
      } else {
        processedData = audioData;
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(processedData)) {
        throw new Error('Invalid base64 audio data format');
      }
      
      // Always prioritize native file sharing on mobile
      if (this.isCapacitorAvailable && Capacitor?.isNativePlatform?.()) {
        try {
          const { Share } = await import('@capacitor/share');
          const { Directory, Filesystem } = await import('@capacitor/filesystem');
          
          // Write file to Documents directory for iOS Files app access
          const exportFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `exports/${exportFileName}`;
          
          // Ensure exports directory exists
          try {
            await Filesystem.mkdir({
              path: 'exports',
              directory: Directory.Documents,
              recursive: true
            });
          } catch (mkdirError) {
            console.log('Exports directory already exists or creation failed');
          }
          
          // Write the file to Documents
          await Filesystem.writeFile({
            path: filePath,
            data: processedData,
            directory: Directory.Documents
          });
          
          // Get the file URI for sharing
          const fileUri = await Filesystem.getUri({
            directory: Directory.Documents,
            path: filePath
          });
          
          console.log('📁 File saved to Documents:', fileUri.uri);
          
          // Use native share sheet to let user choose export location
          await Share.share({
            title: 'Export Audio Recording',
            text: `Share or save: ${fileName}`,
            url: fileUri.uri,
            dialogTitle: 'Choose where to save or share'
          });
          
          console.log('✅ Native file export completed - user can access via Files app');
          return;
          
        } catch (shareError) {
          console.warn('⚠️ Native share failed:', shareError);
          throw shareError; // Don't fallback, show the error
        }
      }
      
      // Fallback for web browsers
      try {
        const binaryString = atob(processedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Browser download initiated');
      } catch (decodeError) {
        console.error('❌ Failed to decode audio data:', decodeError);
        throw new Error(`Failed to process audio data: ${decodeError.message}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to share audio file:', error);
      throw new Error(`Export failed: ${error.message}. Make sure you have sufficient storage space.`);
    }
  }

  getStorageMode(): 'native' | 'memory' {
    return this.isCapacitorAvailable ? 'native' : 'memory';
  }

  isNativeStorageAvailable(): boolean {
    return this.isCapacitorAvailable;
  }
}

export const SafeProjectManager = new SafeProjectManagerService();