import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { Entity } from "@/models";
import { FPS_CHARACTER_CONFIG } from "@/models/character-controller";
import { useEntityState } from "@/hooks/use-entity-state";
import useGameStudioStore from "@/stores/game-studio-store";

interface CharacterControllerSectionProps {
  entity: Entity;
}

export function CharacterControllerSection({ entity }: CharacterControllerSectionProps) {
  useEntityState(entity);
  const hasController = entity.hasCharacterController;
  const { setCharacterControllerEditorOpen, setCharacterControllerEditorEntity } = useGameStudioStore();

  const handleToggleController = () => {
    if (hasController) {
      entity.disableCharacterController();
    } else {
      entity.enableCharacterController(FPS_CHARACTER_CONFIG);
    }
  };

  const handleOpenPanel = () => {
    setCharacterControllerEditorEntity(entity.entityId.toString());
    setCharacterControllerEditorOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-orange-300 text-sm font-medium">Character Controller</h3>
        <div className="flex items-center gap-2">
          {hasController && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenPanel}
              className="h-7 w-7 p-0 text-gray-400 hover:text-orange-300 hover:bg-orange-500/10"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Switch
            checked={hasController}
            onCheckedChange={handleToggleController}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
      </div>
    </div>
  );
} 