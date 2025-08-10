import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FolderIcon, PlusIcon, TrashIcon, MusicIcon } from 'lucide-react';
import { Project } from '@/services/ProjectManager';
import { SafeProjectManager as ProjectManager } from '@/services/SafeProjectManager';
import { useToast } from '@/hooks/use-toast';

interface ProjectSelectorProps {
  currentProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onNewProject: (project: Project) => void;
}

export function ProjectSelector({ currentProject, onProjectSelect, onNewProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      await ProjectManager.initialize();
      const allProjects = await ProjectManager.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error loading projects",
        description: "Could not load your saved projects.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newProject = ProjectManager.createNewProject(newProjectName.trim());
      await ProjectManager.saveProject(newProject);
      
      setProjects(prev => [newProject, ...prev]);
      onNewProject(newProject);
      setNewProjectName('');
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Project created!",
        description: `"${newProject.name}" is ready for recording.`,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error creating project",
        description: "Could not create the new project.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await ProjectManager.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // If we deleted the current project, clear it
      if (currentProject?.id === projectId) {
        onProjectSelect(ProjectManager.createNewProject('Untitled Project'));
      }
      
      toast({
        title: "Project deleted",
        description: "The project has been removed.",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error deleting project",
        description: "Could not delete the project.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FolderIcon className="w-5 h-5" />
            Your Projects
          </h3>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <PlusIcon className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject}>
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MusicIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet</p>
            <p className="text-sm">Create your first music project to get started</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                  currentProject?.id === project.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
                onClick={() => onProjectSelect(project)}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{project.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{project.tracks.length} tracks</span>
                    <span>{formatDate(project.lastModified)}</span>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{project.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteProject(project.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}