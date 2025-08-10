import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Project, AudioTrack } from './ProjectManager';

class SafeProjectManagerService {
  private isCapacitorAvailable = false;
  private isInitialized = false;
  private memoryProjects: Map<string, Project> = new Map();

  async initialize() {
    console.log('SafeProjectManager initializing...');
    
    try {
      this.isCapacitorAvailable = Capacitor.isNativePlatform();
      console.log('Capacitor native platform:', this.isCapacitorAvailable);

      if (this.isCapacitorAvailable) {
        try {
          // Try to create directories
          await Filesystem.mkdir({
            path: 'riff-layer-muse',
            directory: Directory.Documents,
            recursive: true
          });
          
          await Filesystem.mkdir({
            path: 'riff-layer-muse/projects',
            directory: Directory.Documents,
            recursive: true
          });
          
          console.log('Capacitor filesystem initialized successfully');
        } catch (error: any) {
          console.warn('Capacitor filesystem initialization failed, falling back to memory:', error.message);
          this.isCapacitorAvailable = false;
        }
      }

      this.isInitialized = true;
      console.log('SafeProjectManager initialized with storage mode:', this.isCapacitorAvailable ? 'native' : 'memory');
    } catch (error) {
      console.error('SafeProjectManager initialization error:', error);
      this.isCapacitorAvailable = false;
      this.isInitialized = true; // Still mark as initialized to continue
      throw error;
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

    if (this.isCapacitorAvailable) {
      try {
        const projectData = JSON.stringify(project, null, 2);
        await Filesystem.writeFile({
          path: `riff-layer-muse/projects/${project.id}.json`,
          data: projectData,
          directory: Directory.Documents,
          encoding: 'utf8' as any
        });
        console.log('Project saved to filesystem successfully');
      } catch (error) {
        console.warn('Failed to save to filesystem, kept in memory:', error);
        // Don't throw error, just continue with memory storage
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
    if (this.isCapacitorAvailable) {
      try {
        const result = await Filesystem.readFile({
          path: `riff-layer-muse/projects/${projectId}.json`,
          directory: Directory.Documents,
          encoding: 'utf8' as any
        });
        
        const project = JSON.parse(result.data as string);
        this.memoryProjects.set(projectId, project); // Cache in memory
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
    if (this.isCapacitorAvailable && projects.length === 0) {
      try {
        const result = await Filesystem.readdir({
          path: 'riff-layer-muse/projects',
          directory: Directory.Documents
        });

        for (const file of result.files) {
          if (file.name.endsWith('.json')) {
            try {
              const projectData = await Filesystem.readFile({
                path: `riff-layer-muse/projects/${file.name}`,
                directory: Directory.Documents,
                encoding: 'utf8' as any
              });
              
              const project = JSON.parse(projectData.data as string);
              projects.push(project);
              this.memoryProjects.set(project.id, project); // Cache in memory
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
    if (this.isCapacitorAvailable) {
      try {
        await Filesystem.deleteFile({
          path: `riff-layer-muse/projects/${projectId}.json`,
          directory: Directory.Documents
        });
        console.log('Project deleted from filesystem');
      } catch (error) {
        console.warn('Failed to delete from filesystem:', error);
        // Don't throw error, memory deletion was successful
      }
    }
  }

  async shareAudioFile(audioData: string, fileName: string): Promise<void> {
    console.log('Sharing audio file:', fileName);
    // This is a basic implementation - in a real app you'd use proper sharing
    // For now, just create a download link
    const blob = new Blob([atob(audioData)], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getStorageMode(): 'native' | 'memory' {
    return this.isCapacitorAvailable ? 'native' : 'memory';
  }

  isNativeStorageAvailable(): boolean {
    return this.isCapacitorAvailable;
  }
}

export const SafeProjectManager = new SafeProjectManagerService();