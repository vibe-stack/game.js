import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Save,
  Play,
  FolderOpen,
} from "lucide-react";

interface MainControlsToolbarProps {
  isSaving: boolean;
  onSave: () => void;
  onOpenFolder: () => void;
  onPlay?: () => void;
}

export default function MainControlsToolbar({
  isSaving,
  onSave,
  onOpenFolder,
  onPlay,
}: MainControlsToolbarProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      } else if (event.key === 'F5') {
        event.preventDefault();
        handlePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  const handlePlay = () => {
    if (onPlay) {
      onPlay();
    } else {
      // TODO: Implement default play functionality
      console.log("Play action triggered");
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
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
        <Save size={16} />
        {isSaving ? "..." : "Save"}
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        className="gap-2 h-8"
        onClick={handlePlay}
        title="Play Scene (F5)"
      >
        <Play size={16} />
        Play
      </Button>
    </div>
  );
} 