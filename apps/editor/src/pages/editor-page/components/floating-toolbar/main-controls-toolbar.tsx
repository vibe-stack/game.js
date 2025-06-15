import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import useEditorStore from "@/stores/editor-store";
import PhysicsControlsToolbar from "./physics-controls-toolbar";
import { SettingsDialog } from "@/components/settings-dialog";
import { ClientExportService } from "@/services/export-service";
import { gameWorld } from "@/services/game-world";

interface MainControlsToolbarProps {
  isSaving: boolean;
  onSave: () => void;
  onOpenFolder: () => void;
}

export default function MainControlsToolbar({
  isSaving,
  onSave,
  onOpenFolder,
}: MainControlsToolbarProps) {
  const {
    physicsState,
    playPhysics,
    pausePhysics,
    stopPhysics,
    resumePhysics,
    currentProject,
    currentScene,
  } = useEditorStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load script status when project changes
  useEffect(() => {
    loadScriptStatus();
  }, [currentProject]);

  const loadScriptStatus = async () => {
    if (!currentProject) return;

    try {
      await window.scriptAPI.getCompilationStatus(currentProject.path);
    } catch (error) {
      console.error("Failed to get script status:", error);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!currentProject) return;
      await window.scriptAPI.startWatching(currentProject.path);
    };
    run();

    return () => {
      if (!currentProject) return;
      window.scriptAPI.stopWatching(currentProject.path);
    };
  }, [currentProject]);

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

  const exportService = new ClientExportService(gameWorld);

  const handleExport = async (format: "json" | "threejs" | "glb") => {
    if (!currentScene || !currentProject) {
      alert("No scene or project loaded");
      return;
    }

    setIsExporting(true);
    
    try {
      let blob: Blob;
      let filename: string;
      
      switch (format) {
        case "json":
          blob = await exportService.exportAsJSON();
          filename = `${currentScene.name}-gamejs.zip`;
          break;
        case "threejs":
          blob = await exportService.exportAsThreeJSON();
          filename = `${currentScene.name}-threejs.zip`;
          break;
        case "glb":
          blob = await exportService.exportAsGLB();
          filename = `${currentScene.name}.glb`;
          break;
        default:
          throw new Error("Unknown export format");
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className={`bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center gap-1 rounded-lg border px-2 py-2 shadow-lg backdrop-blur transition-all duration-300 ease-in-out ${
            physicsState === "playing"
              ? "pointer-events-none translate-x-5 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 gap-2"
            title="Project Settings"
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

        {/* Physics Controls */}
        <PhysicsControlsToolbar
          physicsState={physicsState}
          onPlay={playPhysics}
          onPause={pausePhysics}
          onStop={stopPhysics}
          onResume={resumePhysics}
        />
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
