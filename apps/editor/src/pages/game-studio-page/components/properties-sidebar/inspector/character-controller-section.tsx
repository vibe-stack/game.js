import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { Entity } from "@/models";
import { CharacterControllerProperties } from "./character-controller-properties";
import { FPS_CHARACTER_CONFIG } from "@/models/character-controller";
import { useEntityState } from "@/hooks/use-entity-state";

interface CharacterControllerSectionProps {
  entity: Entity;
}

export function CharacterControllerSection({ entity }: CharacterControllerSectionProps) {
  useEntityState(entity);
  const hasController = entity.hasCharacterController;
  const [isExpanded, setIsExpanded] = useState(hasController);

  const handleToggleController = () => {
    if (hasController) {
      entity.disableCharacterController();
      setIsExpanded(false);
    } else {
      // Add character controller with default FPS config
      entity.enableCharacterController(FPS_CHARACTER_CONFIG);
      setIsExpanded(true);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-orange-300 text-sm font-medium">Character Controller</h3>
            <Switch
              checked={hasController}
              onCheckedChange={handleToggleController}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
          
          {hasController && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
            >
              {isExpanded ? (
                <X className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {!hasController && (
          <p className="text-xs text-gray-400 mt-2">
            Enable to turn this entity into a player character with movement, camera, and input controls.
          </p>
        )}

        {hasController && isExpanded && (
          <>
            <Separator className="bg-gray-600 my-3" />
            <CharacterControllerProperties
              entity={entity}
            />
          </>
        )}
      </div>
    </div>
  );
} 