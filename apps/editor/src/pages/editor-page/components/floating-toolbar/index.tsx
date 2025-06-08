import React from "react";
import useEditorStore from "@/stores/editor-store";
import ProjectInfoToolbar from "./project-info-toolbar";
import EditorModeToolbar from "./editor-mode-toolbar";
import MainControlsToolbar from "./main-controls-toolbar";

interface FloatingToolbarProps {
  isSaving: boolean;
  onSave: () => void;
  onHome: () => void;
  onOpenFolder: () => void;
  onPlay?: () => void;
  physicsState?: 'stopped' | 'playing' | 'paused';
  onPhysicsPlay?: () => void;
  onPhysicsPause?: () => void;
  onPhysicsStop?: () => void;
  onPhysicsResume?: () => void;
}

export default function FloatingToolbar({
  isSaving,
  onSave,
  onHome,
  onOpenFolder,
  onPlay,
  physicsState,
  onPhysicsPlay,
  onPhysicsPause,
  onPhysicsStop,
  onPhysicsResume,
}: FloatingToolbarProps) {
  const { currentProject } = useEditorStore();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full flex items-center justify-between px-4 gap-2">
      <ProjectInfoToolbar
        projectName={currentProject?.name}
        onHome={onHome}
      />

      <EditorModeToolbar />

      <MainControlsToolbar
        isSaving={isSaving}
        onSave={onSave}
        onOpenFolder={onOpenFolder}
        onPlay={onPlay}
        physicsState={physicsState}
        onPhysicsPlay={onPhysicsPlay}
        onPhysicsPause={onPhysicsPause}
        onPhysicsStop={onPhysicsStop}
        onPhysicsResume={onPhysicsResume}
      />
    </div>
  );
} 