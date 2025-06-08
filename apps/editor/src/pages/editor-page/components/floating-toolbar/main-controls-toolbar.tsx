import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Save,
  FolderOpen,
  Loader2Icon,
} from "lucide-react";
import useEditorStore from "@/stores/editor-store";
import PhysicsControlsToolbar from "./physics-controls-toolbar";

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
    setPhysicsState 
  } = useEditorStore();

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
  );
} 