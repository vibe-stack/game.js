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
}

export default function FloatingToolbar({
  isSaving,
  onSave,
  onHome,
  onOpenFolder,
}: FloatingToolbarProps) {
  const { currentProject, physicsState } = useEditorStore();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full flex items-center justify-between px-4 gap-2">
      <div 
        className={`transition-all duration-300 ease-in-out ${
          physicsState === 'playing' 
            ? 'opacity-0 -translate-x-5 pointer-events-none' 
            : 'opacity-100 translate-x-0'
        }`}
      >
        <ProjectInfoToolbar
          projectName={currentProject?.name}
          onHome={onHome}
        />
      </div>

      <div 
        className={`transition-all duration-300 ease-in-out ${
          physicsState === 'playing' 
            ? 'opacity-0 scale-95 pointer-events-none' 
            : 'opacity-100 scale-100'
        }`}
      >
        <EditorModeToolbar />
      </div>

      <MainControlsToolbar
        isSaving={isSaving}
        onSave={onSave}
        onOpenFolder={onOpenFolder}
      />
    </div>
  );
} 