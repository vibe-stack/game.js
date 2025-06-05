import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderOpen, Play } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export default function HomePage() {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projects = await window.projectAPI.loadProjects();
      setProjects(projects);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      const newProject = await window.projectAPI.createProject(newProjectName);
      setProjects(prev => [newProject, ...prev]);
      setNewProjectName("");
      setIsCreateDialogOpen(false);
      
      // Navigate to editor for the new project
      navigate({ to: "/editor", search: { project: newProjectName } });
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const openProject = (project: GameProject) => {
    navigate({ to: "/editor", search: { project: project.name } });
  };

  const openProjectFolder = async (project: GameProject) => {
    try {
      await window.projectAPI.openProjectFolder(project.path);
    } catch (error) {
      console.error("Failed to open project folder:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">GameJS</h1>
          <p className="text-muted-foreground">Your game development workspace</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Game Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="my-awesome-game"
                  disabled={isCreating}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createProject}
                  disabled={!newProjectName.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first GameJS project to get started
          </p>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" />
                Create Project
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.name} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.isRunning && (
                    <Badge variant="secondary" className="gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Running
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Last modified: {project.lastModified.toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => openProject(project)}
                    className="flex-1 gap-2"
                  >
                    <Play size={14} />
                    Open
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openProjectFolder(project)}
                    className="gap-2"
                  >
                    <FolderOpen size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
