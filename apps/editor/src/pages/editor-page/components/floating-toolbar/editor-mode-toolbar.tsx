import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Move3D, RotateCcw, MousePointerIcon,
  Rotate3d,
  Scale3d
} from "lucide-react";
import useEditorStore from "@/stores/editor-store";

export default function EditorModeToolbar() {
  const { editorMode, setEditorMode } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'q':
          event.preventDefault();
          setEditorMode('select');
          break;
        case 'w':
          event.preventDefault();
          setEditorMode('move');
          break;
        case 'e':
          event.preventDefault();
          setEditorMode('rotate');
          break;
        case 'r':
          event.preventDefault();
          setEditorMode('scale');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setEditorMode]);

  const handleUndo = () => {
    // TODO: Implement undo functionality
    console.log("Undo action triggered");
  };

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <Button
        size="sm"
        variant={editorMode === "select" ? "default" : "ghost"}
        onClick={() => setEditorMode("select")}
        className="h-8 w-8 p-0"
        title="Select Mode (Q)"
      >
        <MousePointerIcon size={16} />
      </Button>
      <Button
        size="sm"
        variant={editorMode === "move" ? "default" : "ghost"}
        onClick={() => setEditorMode("move")}
        className="h-8 w-8 p-0"
        title="Move Mode (W)"
      >
        <Move3D size={16} />
      </Button>
      <Button
        size="sm"
        variant={editorMode === "rotate" ? "default" : "ghost"}
        onClick={() => setEditorMode("rotate")}
        className="h-8 w-8 p-0"
        title="Rotate Mode (E)"
      >
        <Rotate3d size={16} />
      </Button>
      <Button
        size="sm"
        variant={editorMode === "scale" ? "default" : "ghost"}
        onClick={() => setEditorMode("scale")}
        className="h-8 w-8 p-0"
        title="Scale Mode (R)"
      >
        <Scale3d size={16} />
      </Button>
      <div className="bg-border h-4 w-px mx-1" />
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 w-8 p-0"
        onClick={handleUndo}
        title="Undo (Ctrl+Z)"
      >
        <RotateCcw size={16} />
      </Button>
    </div>
  );
} 