import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Save,
  FolderOpen,
  Loader2Icon,
  Settings,
  Download,
  FileText,
  Box,
  Layers,
  Play,
} from "lucide-react";
import useGameStudioStore from "@/stores/game-studio-store";
import GameControlsToolbar from "./physics-controls-toolbar";

interface MainControlsToolbarProps {
  isSaving: boolean;
  onSave: () => void;
  onOpenFolder: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
}

export default function MainControlsToolbar({
  isSaving,
  onSave,
  onOpenFolder,
  onPlay,
  onPause,
  onStop,
  onResume,
}: MainControlsToolbarProps) {
  const {
    gameState,
    playGame,
    pauseGame,
    resetGame,
    resumeGame,
    currentProject,
    currentScene,
    currentSceneName,
    isExporting,
    setExporting,
    loadScene,
    loadDefaultScene,
  } = useGameStudioStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  const handleExport = async (format: "json" | "threejs" | "glb") => {
    if (!currentScene || !currentProject) {
      alert("No scene or project loaded");
      return;
    }

    setExporting(true);
    
    try {
      // TODO: Implement export functionality when available in framework
      console.log(`Exporting as ${format} - placeholder`);
      
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Export as ${format} completed (placeholder)`);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setExporting(false);
    }
  };

  const handleSettings = () => {
    // TODO: Implement settings when available
    console.log("Opening settings - placeholder");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className={`bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center gap-1 rounded-lg border px-2 py-2 shadow-lg backdrop-blur transition-all duration-300 ease-in-out ${
            gameState === "playing"
              ? "pointer-events-none translate-x-5 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={handleSettings}
            className="h-8 gap-2"
            title="Game Studio Settings"
          >
            <Settings size={16} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-2"
                disabled={isExporting || !currentScene}
                title="Export Scene"
              >
                {isExporting ? (
                  <Loader2Icon size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => handleExport("json")}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>GameJS JSON (.zip)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("threejs")}
                  className="cursor-pointer"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  <span>Three.js JSON (.zip)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("glb")}
                  className="cursor-pointer"
                >
                  <Box className="mr-2 h-4 w-4" />
                  <span>GLB Model (.glb)</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-2"
                title="Switch Scene"
              >
                <Layers size={16} />
                {currentSceneName || "Select Scene"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Switch Scene</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => loadDefaultScene()}
                  className="cursor-pointer"
                >
                  <Play className="mr-2 h-4 w-4" />
                  <span>Demo Scene</span>
                </DropdownMenuItem>
                {currentProject?.scenes?.map((sceneName) => (
                  <DropdownMenuItem
                    key={sceneName}
                    onClick={() => loadScene(sceneName)}
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{sceneName}</span>
                  </DropdownMenuItem>
                ))}
                {(!currentProject?.scenes || currentProject.scenes.length === 0) && (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">No project scenes available</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenFolder}
            className="h-8 gap-2"
            title="Open Project Folder"
          >
            <FolderOpen size={16} />
          </Button>
          
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-8 gap-2"
            title="Save Scene (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2Icon size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
          </Button>
        </div>

        {/* Game Controls */}
        <GameControlsToolbar
          physicsState={gameState}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onResume={onResume}
        />
      </div>
    </>
  );
} 