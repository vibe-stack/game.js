import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useGameStudioStore from "@/stores/game-studio-store";
import { GameScene, SceneData } from "@/types/project";
import { SceneLoader } from "@/models";
import { toast } from "sonner";

interface ProjectInfoToolbarProps {
  projectName?: string;
  onHome: () => void;
}

export default function ProjectInfoToolbar({
  projectName,
  onHome,
}: ProjectInfoToolbarProps) {
  const {
    currentProject,
    currentScene,
    availableScenes,
    setAvailableScenes,
    setCurrentScene,
    gameWorldService
  } = useGameStudioStore();

  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadAvailableScenes();
    }
  }, [currentProject]);

  const loadAvailableScenes = async () => {
    if (!currentProject?.path) return;

    try {
      setIsLoading(true);
      const scenes = await window.projectAPI.listScenes(currentProject.path);
      setAvailableScenes(scenes);

      // If no current scene is selected but scenes exist, select the first one
      if (!currentScene && scenes.length > 0) {
        await handleSceneChange(scenes[0]);
      }
    } catch (error) {
      console.error('Failed to load scenes:', error);
      toast.error('Failed to load scenes from project');

      // Fallback to default scene if no scenes exist
      if (!currentScene) {
        await createDefaultScene();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultScene = async () => {
    if (!currentProject?.path) return;

    try {
      const defaultSceneData = SceneLoader.getDefaultSceneData();
      const sceneName = "main-scene";

      await window.projectAPI.createScene(currentProject.path, sceneName, defaultSceneData);
      setAvailableScenes([sceneName]);

      const sceneWithMetadata: GameScene = {
        ...defaultSceneData,
        name: sceneName,
        id: sceneName
      };
      setCurrentScene(sceneWithMetadata);

      // Load the scene in the game world
      if (gameWorldService) {
        await gameWorldService.loadSceneFromFile(defaultSceneData, sceneName);
      }

      toast.success('Default scene created');
    } catch (error) {
      console.error('Failed to create default scene:', error);
      toast.error('Failed to create default scene');
    }
  };

  const getSceneName = (sceneId: string) => {
    // Convert scene ID back to display name
    return sceneId.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const convertDisplayNameToId = (displayName: string) => {
    // Convert display name to scene ID (kebab-case)
    return displayName.toLowerCase().replace(/\s+/g, '-');
  };

  const handleSceneChange = async (sceneName: string) => {
    if (!currentProject?.path) return;

    try {
      setIsLoading(true);

      // Load scene data from project
      const sceneData = await window.projectAPI.loadScene(currentProject.path, sceneName);

      // Update current scene in store
      const sceneWithMetadata: GameScene = {
        ...sceneData,
        name: sceneName,
        id: sceneName
      };
      setCurrentScene(sceneWithMetadata);
      // Switch scene in the project
      await window.projectAPI.switchScene(currentProject.path, sceneName);
      // Load scene in the game world with filename tracking
      if (gameWorldService) {
        await gameWorldService.loadSceneFromFile(sceneData, sceneName);
      }
    } catch (error) {
      console.error('Failed to switch scene:', error);
      toast.error('Failed to switch scene');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateScene = async () => {
    if (!currentProject?.path || !newSceneName.trim()) return;

    setIsCreating(true);
    try {
      const sceneName = convertDisplayNameToId(newSceneName.trim());
      const defaultSceneData = SceneLoader.getDefaultSceneData();

      // Update scene data with user-provided name
      const sceneDataWithName: SceneData = {
        ...defaultSceneData,
        name: newSceneName.trim(),
        id: sceneName
      };

      // Create scene in project
      await window.projectAPI.createScene(currentProject.path, sceneName, sceneDataWithName);

      // Refresh scene list
      await loadAvailableScenes();

      // Switch to the new scene
      await handleSceneChange(sceneName);

      setNewSceneName("");
      setIsCreateSceneOpen(false);
      toast.success(`Scene "${newSceneName.trim()}" created successfully`);
    } catch (error) {
      console.error('Failed to create scene:', error);
      toast.error('Failed to create scene');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSceneName.trim()) {
      handleCreateScene();
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <Button
        size="sm"
        variant="outline"
        onClick={onHome}
        className="gap-2 h-8"
      >
        <Home size={16} />
      </Button>
      <div className="bg-border h-4 w-px" />
      <div className="flex items-center gap-2">
        <span className="font-medium text-xs">{projectName}</span>
        <div className="flex items-center gap-1">
          <Select
            value={currentScene?.name || ""}
            onValueChange={handleSceneChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-32 h-6 text-xs border-0 bg-transparent hover:bg-accent focus:ring-0">
              <SelectValue placeholder={isLoading ? "Loading..." : "No Scene"}>
                {isLoading ? "Loading..." : currentScene ? getSceneName(currentScene.name) : "No Scene"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableScenes.map((sceneName) => (
                <SelectItem key={sceneName} value={sceneName}>
                  {getSceneName(sceneName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={isCreateSceneOpen} onOpenChange={setIsCreateSceneOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                disabled={!currentProject}
              >
                <Plus size={12} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Create New Scene</h4>
                  <p className="text-xs text-muted-foreground">
                    Enter a name for your new scene
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scene-name">Scene Name</Label>
                  <Input
                    id="scene-name"
                    placeholder="My New Scene"
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreateSceneOpen(false);
                      setNewSceneName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateScene}
                    disabled={!newSceneName.trim() || isCreating}
                  >
                    {isCreating ? "Creating..." : "Create Scene"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
} 