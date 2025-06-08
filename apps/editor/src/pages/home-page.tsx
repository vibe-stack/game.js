import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FolderOpen, Play, Settings, Folder } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import useEditorStore from "@/stores/editor-store";

export default function HomePage() {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedDirectory, setSelectedDirectory] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { setCurrentProject, setProjects: setStoreProjects } = useEditorStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const loadedProjects = await window.projectAPI.loadProjects();
      setProjects(loadedProjects);
      setStoreProjects(loadedProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
    }
  };

  const selectDirectory = async () => {
    try {
      const directory = await window.projectAPI.selectProjectDirectory();
      if (directory) {
        setSelectedDirectory(directory);
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const newProject = await window.projectAPI.createProject(
        newProjectName,
        selectedDirectory || undefined,
      );

      await loadProjects(); // Refresh the project list
      setNewProjectName("");
      setSelectedDirectory("");
      setIsCreateDialogOpen(false);

      // Set current project and navigate to editor
      setCurrentProject(newProject);
      navigate({ to: "/editor" });
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const openProject = async (project: GameProject) => {
    try {
      // Load fresh project data
      const freshProject = await window.projectAPI.openProject(project.path);
      setCurrentProject(freshProject);
      navigate({ to: "/editor" });
    } catch (error) {
      console.error("Failed to open project:", error);
    }
  };

  const openProjectFolder = async (project: GameProject) => {
    try {
      await window.projectAPI.openProjectFolder(project.path);
    } catch (error) {
      console.error("Failed to open project folder:", error);
    }
  };

  const resetCreateDialog = () => {
    setNewProjectName("");
    setSelectedDirectory("");
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GameJS Editor</h1>
          <p className="text-muted-foreground">
            Visual game development environment
          </p>
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
              <div>
                <Label htmlFor="project-directory">
                  Project Directory (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="project-directory"
                    value={selectedDirectory}
                    placeholder="Uses default directory if not specified"
                    readOnly
                    disabled={isCreating}
                  />
                  <Button
                    variant="outline"
                    onClick={selectDirectory}
                    disabled={isCreating}
                    className="gap-2"
                  >
                    <Folder size={16} />
                    Browse
                  </Button>
                </div>
                {selectedDirectory && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Project will be created in: {selectedDirectory}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={resetCreateDialog}
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
        <div className="py-12 text-center">
          <div className="bg-muted mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
            <Play size={32} className="text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No projects yet</h2>
          <p className="text-muted-foreground mx-auto mb-6 max-w-md">
            Create your first GameJS project to start building interactive 3D
            games and experiences
          </p>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" />
                Create Your First Project
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.path}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.isRunning && (
                    <Badge variant="secondary" className="gap-1">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      Running
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    Last modified:{" "}
                    {new Date(project.lastModified).toLocaleDateString()}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {project.scenes.length} scene
                    {project.scenes.length !== 1 ? "s" : ""}
                  </p>
                  {project.metadata.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {project.metadata.description}
                    </p>
                  )}
                </div>
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
                  <Button size="sm" variant="outline" className="gap-2">
                    <Settings size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-2 text-sm">
            Ready to start a new project?
          </p>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus size={16} />
                Create Another Project
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}
    </div>
  );
}
