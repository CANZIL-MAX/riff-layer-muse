// ESM imports with fallbacks for mobile support
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Project, AudioTrack } from './ProjectManager';

let isCapacitorAvailable = false;
let FilesystemAPI: any = null;
let DirectoryAPI: any = null;

try {
  // Check if Capacitor is available and running natively
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

class SafeProjectManagerService {
  private isCapacitorAvailable = isCapacitorAvailable;
  private isInitialized = false;
  private memoryProjects: Map<string, Project> = new Map();
  private nativeStorageVerified = false;

  async initialize() {
    console.log('🚀 SafeProjectManager initializing...');
    
    try {
      this.isCapacitorAvailable = isCapacitorAvailable;
      console.log('📱 Native platform detected:', this.isCapacitorAvailable);

      if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
        // Retry logic for initialization
        let initSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`📁 Initializing filesystem (attempt ${attempt}/3)...`);
            
            // Create base directory
            try {
              await FilesystemAPI.mkdir({
                path: 'riff-layer-muse',
                directory: DirectoryAPI.Documents,
                recursive: true
              });
              console.log('✅ Base directory created/verified');
            } catch (error: any) {
              if (!error.message?.includes('exists')) {
                throw error;
              }
              console.log('📁 Base directory already exists');
            }

            // Create projects directory
            try {
              await FilesystemAPI.mkdir({
                path: 'riff-layer-muse/projects',
                directory: DirectoryAPI.Documents,
                recursive: true
              });
              console.log('✅ Projects directory created/verified');
            } catch (error: any) {
              if (!error.message?.includes('exists')) {
                throw error;
              }
              console.log('📁 Projects directory already exists');
            }
            
            // Test write
            const testPath = 'riff-layer-muse/projects/test-verify.json';
            const testData = JSON.stringify({ test: true, timestamp: Date.now() });
            console.log('🧪 Testing filesystem write...');
            
            await FilesystemAPI.writeFile({
              path: testPath,
              data: testData,
              directory: DirectoryAPI.Documents,
              encoding: Encoding.UTF8
            });
            
            // Verify by reading back
            console.log('🧪 Verifying write...');
            const readResult = await FilesystemAPI.readFile({
              path: testPath,
              directory: DirectoryAPI.Documents,
              encoding: Encoding.UTF8
            });
            
            const readData = typeof readResult.data === 'string' ? readResult.data : JSON.stringify(readResult.data);
            console.log('🧪 Read back:', readData);
            
            // Clean up
            await FilesystemAPI.deleteFile({
              path: testPath,
              directory: DirectoryAPI.Documents
            });
            
            console.log('✅ Filesystem verified and working!');
            this.nativeStorageVerified = true;
            initSuccess = true;
            break;
            
          } catch (error: any) {
            console.error(`❌ Init attempt ${attempt} failed:`, error.message || error);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!initSuccess) {
          throw new Error('Failed to initialize after 3 attempts');
        }
      } else {
        console.log('📱 Not on native platform - using memory-only storage');
        this.isCapacitorAvailable = false;
      }

      this.isInitialized = true;
      console.log('✅ SafeProjectManager ready -', this.nativeStorageVerified ? 'PERSISTENT' : 'MEMORY-ONLY');
      
    } catch (error: any) {
      console.error('❌ Init failed:', error.message || error);
      this.isCapacitorAvailable = false;
      this.nativeStorageVerified = false;
      this.isInitialized = true;
      console.log('🔄 Fallback to memory-only');
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
    console.log('📝 Created project:', project.name, '| Storage:', this.nativeStorageVerified ? 'PERSISTENT' : 'MEMORY-ONLY');
    
    return project;
  }

  async saveProject(project: Project): Promise<void> {
    console.log('💾 Saving project:', project.name);
    
    // Always save to memory first
    this.memoryProjects.set(project.id, { ...project });

    if (this.isCapacitorAvailable && this.nativeStorageVerified && FilesystemAPI && DirectoryAPI) {
      try {
        const projectData = JSON.stringify(project, null, 2);
        const filePath = `riff-layer-muse/projects/${project.id}.json`;
        
        console.log('📝 Writing to filesystem:', filePath);
        await FilesystemAPI.writeFile({
          path: filePath,
          data: projectData,
          directory: DirectoryAPI.Documents,
          encoding: Encoding.UTF8
        });
        
        // Verify write by reading back
        console.log('🔍 Verifying write...');
        const verifyRead = await FilesystemAPI.readFile({
          path: filePath,
          directory: DirectoryAPI.Documents,
          encoding: Encoding.UTF8
        });
        
        if (verifyRead.data) {
          console.log('✅ Project saved and verified on filesystem');
        } else {
          throw new Error('Verification failed - no data read back');
        }
      } catch (error: any) {
        console.error('❌ Failed to save to filesystem:', error.message || error);
        console.error('📋 Full error:', JSON.stringify(error, null, 2));
        throw error; // Don't silently fail
      }
    } else {
      console.warn('⚠️ Project saved to MEMORY ONLY - will be lost on app restart');
    }
  }

  async loadProject(projectId: string): Promise<Project> {
    console.log('📂 Loading project:', projectId);
    
    // Try memory first
    const memoryProject = this.memoryProjects.get(projectId);
    if (memoryProject) {
      console.log('✅ Loaded from memory');
      return memoryProject;
    }

    // Try filesystem
    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
      try {
        const result = await FilesystemAPI.readFile({
          path: `riff-layer-muse/projects/${projectId}.json`,
          directory: DirectoryAPI.Documents,
          encoding: Encoding.UTF8
        });
        
        const project = JSON.parse(result.data as string);
        this.memoryProjects.set(projectId, project);
        console.log('✅ Loaded from filesystem');
        return project;
      } catch (error: any) {
        console.error('❌ Failed to load from filesystem:', error.message || error);
      }
    }

    throw new Error(`Project ${projectId} not found`);
  }

  async getAllProjects(): Promise<Project[]> {
    console.log('📂 Getting all projects...');
    
    const projects: Project[] = [];
    
    // Get from memory
    projects.push(...Array.from(this.memoryProjects.values()));
    console.log('💾 Projects in memory:', projects.length);

    // Try to get from filesystem if no projects in memory
    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI && projects.length === 0) {
      try {
        console.log('📂 Reading from filesystem...');
        const result = await FilesystemAPI.readdir({
          path: 'riff-layer-muse/projects',
          directory: DirectoryAPI.Documents
        });
        
        console.log('📋 Raw readdir result:', JSON.stringify(result, null, 2));
        
        // Handle different API responses
        let files: any[] = [];
        if (result && typeof result === 'object') {
          if (Array.isArray(result.files)) {
            files = result.files;
          } else if (Array.isArray(result)) {
            files = result;
          }
        }
        
        console.log('📁 Files found:', files.length);

        for (const file of files) {
          if (file && (typeof file === 'string' ? file.endsWith('.json') : file.name?.endsWith('.json'))) {
            const fileName = typeof file === 'string' ? file : file.name;
            if (fileName && fileName !== 'test-verify.json' && fileName !== 'test-release.json') {
              try {
                console.log('📖 Loading:', fileName);
                const projectData = await FilesystemAPI.readFile({
                  path: `riff-layer-muse/projects/${fileName}`,
                  directory: DirectoryAPI.Documents,
                  encoding: Encoding.UTF8
                });
                
                const project = JSON.parse(projectData.data as string);
                projects.push(project);
                this.memoryProjects.set(project.id, project);
                console.log('✅ Loaded:', project.name);
              } catch (error: any) {
                console.error(`❌ Failed to load ${fileName}:`, error.message || error);
              }
            }
          }
        }
        
        console.log('📊 Total projects loaded:', projects.length);
      } catch (error: any) {
        console.error('❌ Failed to read projects directory:', error.message || error);
        console.error('📋 Full error:', JSON.stringify(error, null, 2));
      }
    }

    return projects.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  async deleteProject(projectId: string): Promise<void> {
    console.log('🗑️ Deleting project:', projectId);
    
    // Remove from memory
    this.memoryProjects.delete(projectId);

    // Try to remove from filesystem
    if (this.isCapacitorAvailable && FilesystemAPI && DirectoryAPI) {
      try {
        await FilesystemAPI.deleteFile({
          path: `riff-layer-muse/projects/${projectId}.json`,
          directory: DirectoryAPI.Documents
        });
        console.log('✅ Project deleted from filesystem');
      } catch (error: any) {
        console.warn('⚠️ Failed to delete from filesystem:', error.message || error);
      }
    }
  }

  async shareAudioFile(audioData: string, fileName: string): Promise<void> {
    try {
      console.log('🎵 Sharing audio file:', fileName);
      
      if (!audioData) {
        throw new Error('No audio data provided');
      }

      // Remove data URL prefix if present
      const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');

      // Validate base64
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        throw new Error('Invalid base64 audio data');
      }

      // Use native share on mobile
      if (this.isCapacitorAvailable && Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        
        const exportFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `riff-layer-muse/exports/${exportFileName}`;
        
        try {
          await Filesystem.mkdir({
            path: 'riff-layer-muse/exports',
            directory: Directory.Documents,
            recursive: true
          });
        } catch {
        }
        
        await Filesystem.writeFile({
          path: filePath,
          data: base64Data,
          directory: Directory.Documents
        });
        
        const fileUri = await Filesystem.getUri({
          path: filePath,
          directory: Directory.Documents
        });
        
        await Share.share({
          title: 'Export Audio',
          text: `Share or save: ${fileName}`,
          url: fileUri.uri,
          dialogTitle: 'Choose where to save or share'
        });
        
        console.log('✅ Native share completed');
        return;
      }
      
      // Browser fallback
      const binaryString = atob(base64Data);
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
      
    } catch (error: any) {
      console.error('❌ Failed to share audio:', error.message || error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  getStorageMode(): 'native' | 'memory' {
    return this.nativeStorageVerified ? 'native' : 'memory';
  }

  isNativeStorageAvailable(): boolean {
    return this.nativeStorageVerified;
  }

  getStorageStatus(): { verified: boolean, available: boolean } {
    return {
      verified: this.nativeStorageVerified,
      available: this.isCapacitorAvailable
    };
  }
}

export const SafeProjectManager = new SafeProjectManagerService();
