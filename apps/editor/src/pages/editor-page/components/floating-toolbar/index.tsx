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
}

export default function FloatingToolbar({
  isSaving,
  onSave,
  onHome,
  onOpenFolder,
  onPlay,
}: FloatingToolbarProps) {
  const { currentProject, currentScene } = useEditorStore();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full flex items-center justify-between px-4 gap-2">
      <ProjectInfoToolbar
        projectName={currentProject?.name}
        sceneName={currentScene?.name}
        onHome={onHome}
      />

      <EditorModeToolbar />

      <MainControlsToolbar
        isSaving={isSaving}
        onSave={onSave}
        onOpenFolder={onOpenFolder}
        onPlay={onPlay}
      />
    </div>
  );
} 