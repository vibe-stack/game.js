import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Save,
  FolderOpen,
  Loader2Icon,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import useEditorStore from "@/stores/editor-store";
import PhysicsControlsToolbar from "./physics-controls-toolbar";
import { SettingsDialog } from "@/components/settings-dialog";

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
    setPhysicsState,
    currentProject
  } = useEditorStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<{ isWatching: boolean; compiledCount: number } | null>(null);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);

  // Load script status when project changes
  useEffect(() => {
    if (currentProject) {
      loadScriptStatus();
    } else {
      setScriptStatus(null);
    }
  }, [currentProject]);

  const loadScriptStatus = async () => {
    if (!currentProject) return;

    try {
      const status = await window.scriptAPI.getCompilationStatus(currentProject.path);
      setScriptStatus(status);
    } catch (error) {
      console.error("Failed to get script status:", error);
    }
  };

  const handleToggleScriptWatching = async () => {
    if (!currentProject) return;

    setIsLoadingScripts(true);
    try {
      if (scriptStatus?.isWatching) {
        await window.scriptAPI.stopWatching(currentProject.path);
      } else {
        await window.scriptAPI.startWatching(currentProject.path);
      }
      // Wait a bit for the watcher to initialize
      setTimeout(loadScriptStatus, 500);
    } catch (error) {
      console.error("Failed to toggle script watching:", error);
    } finally {
      setIsLoadingScripts(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  const handlePhysicsPlay = () => {
    playPhysics();
    setPhysicsState('playing');
  };

  const handlePhysicsPause = () => {
    pausePhysics();
    setPhysicsState('paused');
  };

  const handlePhysicsStop = () => {
    stopPhysics();
    setPhysicsState('stopped');
  };

  const handlePhysicsResume = () => {
    resumePhysics();
    setPhysicsState('playing');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div 
          className={`flex items-center gap-1 px-2 py-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg transition-all duration-300 ease-in-out ${
            physicsState === 'playing' 
              ? 'opacity-0 translate-x-5 pointer-events-none' 
              : 'opacity-100 translate-x-0'
          }`}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenFolder}
            className="gap-2 h-8"
            title="Open Project Folder"
          >
            <FolderOpen size={16} />
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 h-8"
            title="Save Scene (Ctrl+S)"
          >
            {isSaving ? <Loader2Icon size={16} className="animate-spin" /> : <Save size={16} />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            className="gap-2 h-8"
            title="Project Settings"
          >
            <Settings size={16} />
          </Button>
          <Button
            size="sm"
            variant={scriptStatus?.isWatching ? "default" : "outline"}
            onClick={handleToggleScriptWatching}
            disabled={isLoadingScripts}
            className="gap-2 h-8"
            title={scriptStatus?.isWatching ? `Stop Script Watching (${scriptStatus.compiledCount} scripts)` : "Start Script Watching"}
          >
            {isLoadingScripts ? (
              <Loader2Icon size={16} className="animate-spin" />
            ) : scriptStatus?.isWatching ? (
              <Eye size={16} />
            ) : (
              <EyeOff size={16} />
            )}
            {scriptStatus?.compiledCount ? scriptStatus.compiledCount : 0}
          </Button>
        </div>

        {/* Physics Controls */}
        <PhysicsControlsToolbar
          physicsState={physicsState}
          onPlay={handlePhysicsPlay}
          onPause={handlePhysicsPause}
          onStop={handlePhysicsStop}
          onResume={handlePhysicsResume}
        />
      </div>

      <SettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </>
  );
} 