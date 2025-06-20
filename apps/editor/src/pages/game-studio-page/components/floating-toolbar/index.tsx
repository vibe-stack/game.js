import React from "react";
import useGameStudioStore from "@/stores/game-studio-store";
import ProjectInfoToolbar from "./project-info-toolbar";
import EditorModeToolbar from "./editor-mode-toolbar";
import MainControlsToolbar from "./main-controls-toolbar";

interface FloatingToolbarProps {
  onHome: () => void;
  onSave: () => void;
  onOpenFolder: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
}

export default function FloatingToolbar({
  onHome,
  onSave,
  onOpenFolder,
  onPlay,
  onPause,
  onStop,
  onResume,
}: FloatingToolbarProps) {
  const { currentProject, gameState, isSaving } = useGameStudioStore();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full flex items-center justify-between px-4 gap-2">
      <div 
        className={`transition-all duration-300 ease-in-out ${
          gameState === 'playing' 
            ? 'opacity-0 -translate-x-5 pointer-events-none' 
            : 'opacity-100 translate-x-0'
        }`}
      >
        <ProjectInfoToolbar
          projectName={currentProject?.name}
          onHome={onHome}
        />
      </div>

      <EditorModeToolbar />

      <MainControlsToolbar
        isSaving={isSaving}
        onSave={onSave}
        onOpenFolder={onOpenFolder}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        onResume={onResume}
      />
    </div>
  );
} 