import React from "react";
import { CharacterControllerPanel } from "./character-controller-panel";
import useGameStudioStore from "@/stores/game-studio-store";
import { EntityLookupService } from "../../material-editor/entity-lookup-service";

export function CharacterControllerEditor() {
  const { 
    characterControllerEditorOpen, 
    characterControllerEditorEntity,
    setCharacterControllerEditorOpen,
    gameWorldService 
  } = useGameStudioStore();

  const handleClose = () => {
    setCharacterControllerEditorOpen(false);
  };

  // Get the entity from the game world
  const entity = characterControllerEditorEntity && gameWorldService 
    ? EntityLookupService.getEntityById(gameWorldService, characterControllerEditorEntity)
    : null;

  if (!characterControllerEditorOpen || !entity) return null;

  return (
    <CharacterControllerPanel
      entity={entity}
      open={characterControllerEditorOpen}
      onClose={handleClose}
    />
  );
} 