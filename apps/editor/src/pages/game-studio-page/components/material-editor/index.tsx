import React from "react";
import { MaterialEditorDialog } from "./material-editor-dialog";
import useGameStudioStore from "@/stores/game-studio-store";

export function MaterialEditor() {
  const { materialEditorOpen, setMaterialEditorOpen } = useGameStudioStore();

  if (!materialEditorOpen) return null;

  return (
    <MaterialEditorDialog
      open={materialEditorOpen}
      onClose={() => setMaterialEditorOpen(false)}
    />
  );
} 