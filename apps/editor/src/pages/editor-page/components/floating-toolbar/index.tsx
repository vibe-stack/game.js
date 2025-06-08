import React from "react";
import { Button } from "@/components/ui/button";
import {
  Save,
  Play,
  Square,
  RotateCcw,
  Move3D,
  RotateCw,
  Maximize,
  Home,
  FolderOpen,
} from "lucide-react";

interface FloatingToolbarProps {
  projectName?: string;
  sceneName?: string;
  isSaving: boolean;
  editorMode: 'select' | 'move' | 'rotate' | 'scale';
  onSave: () => void;
  onHome: () => void;
  onOpenFolder: () => void;
  onSetEditorMode: (mode: 'select' | 'move' | 'rotate' | 'scale') => void;
}

export default function FloatingToolbar({
  projectName,
  sceneName,
  isSaving,
  editorMode,
  onSave,
  onHome,
  onOpenFolder,
  onSetEditorMode,
}: FloatingToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full flex items-center justify-between px-4 gap-2">
      {/* Project Info */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
        <Button
          size="sm"
          variant="outline"
          onClick={onHome}
          className="gap-2 h-8"
        >
          <Home size={16} />
          Home
        </Button>
        <div className="bg-border h-4 w-px" />
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{projectName}</span>
          <span className="text-muted-foreground text-xs">
            {sceneName || "No Scene"}
          </span>
        </div>
      </div>

            {/* Editor Mode Tools */}
            <div className="flex items-center gap-1 p-1 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
        <Button
          size="sm"
          variant={editorMode === "select" ? "default" : "ghost"}
          onClick={() => onSetEditorMode("select")}
          className="h-8 w-8 p-0"
        >
          <Square size={16} />
        </Button>
        <Button
          size="sm"
          variant={editorMode === "move" ? "default" : "ghost"}
          onClick={() => onSetEditorMode("move")}
          className="h-8 w-8 p-0"
        >
          <Move3D size={16} />
        </Button>
        <Button
          size="sm"
          variant={editorMode === "rotate" ? "default" : "ghost"}
          onClick={() => onSetEditorMode("rotate")}
          className="h-8 w-8 p-0"
        >
          <RotateCw size={16} />
        </Button>
        <Button
          size="sm"
          variant={editorMode === "scale" ? "default" : "ghost"}
          onClick={() => onSetEditorMode("scale")}
          className="h-8 w-8 p-0"
        >
          <Maximize size={16} />
        </Button>
        <div className="bg-border h-4 w-px mx-1" />
        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Main Controls */}
      <div className="flex items-center gap-1 px-2 py-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenFolder}
          className="gap-2 h-8"
        >
          <FolderOpen size={16} />
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="gap-2 h-8"
        >
          <Save size={16} />
          {isSaving ? "..." : "Save"}
        </Button>
        <Button size="sm" variant="outline" className="gap-2 h-8">
          <Play size={16} />
          Play
        </Button>
      </div>
    </div>
  );
} 