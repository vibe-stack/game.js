import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useEditorStore from "@/stores/editor-store";

interface ProjectInfoToolbarProps {
  projectName?: string;
  sceneName?: string;
  onHome: () => void;
}

export default function ProjectInfoToolbar({
  projectName,
  onHome,
}: ProjectInfoToolbarProps) {
  const { currentProject, currentScene, switchScene } = useEditorStore();
  const [availableScenes, setAvailableScenes] = useState<string[]>([]);
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAvailableScenes();
  }, [currentProject]);

  const loadAvailableScenes = async () => {
    if (!currentProject) return;
    
    try {
      const scenes = await window.projectAPI.listScenes(currentProject.path);
      setAvailableScenes(scenes);
    } catch (error) {
      console.error('Failed to load scenes:', error);
    }
  };

  const getSceneName = (sceneId: string) => {
    // Convert scene ID back to display name
    return sceneId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleSceneChange = async (sceneName: string) => {
    await switchScene(sceneName);
  };

  const handleCreateScene = async () => {
    if (!currentProject || !newSceneName.trim()) return;
    
    setIsCreating(true);
    try {
      await window.projectAPI.createScene(currentProject.path, newSceneName.trim());
      setNewSceneName("");
      setIsCreateSceneOpen(false);
      await loadAvailableScenes();
      await switchScene(newSceneName.trim().toLowerCase().replace(/\s+/g, '-'));
    } catch (error) {
      console.error('Failed to create scene:', error);
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
            value={currentScene?.id || ""}
            onValueChange={handleSceneChange}
          >
            <SelectTrigger className="w-32 h-6 text-xs border-0 bg-transparent hover:bg-accent focus:ring-0">
              <SelectValue placeholder="No Scene">
                {currentScene ? getSceneName(currentScene.id) : "No Scene"}
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