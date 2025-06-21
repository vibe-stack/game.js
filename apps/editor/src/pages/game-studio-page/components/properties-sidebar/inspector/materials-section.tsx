import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Info } from "lucide-react";
import { Entity } from "@/models";
import { Mesh3D } from "@/models/primitives/mesh-3d";
import useGameStudioStore from "@/stores/game-studio-store";
import { MaterialApplicationService } from "../../material-editor/material-application-service";

interface MaterialsSectionProps {
  entity: Entity;
}

export function MaterialsSection({ entity }: MaterialsSectionProps) {
  const { setMaterialEditorOpen, setMaterialEditorEntity } = useGameStudioStore();

  // Check if entity has the getMaterial method (only Mesh3D entities have materials currently)
  const material = 'getMaterial' in entity && typeof entity.getMaterial === 'function'
    ? entity.getMaterial()
    : null;
  const hasMaterial = material !== null;

  // Get current material definition if available
  const currentMaterialDef = React.useMemo(() => {
    return MaterialApplicationService.getCurrentMaterialFromEntity(entity);
  }, [entity, material]);

  const handleOpenMaterialEditor = () => {
    setMaterialEditorEntity(entity.entityId.toString());
    setMaterialEditorOpen(true);
  };

  const getMaterialDisplayName = () => {
    if (currentMaterialDef) {
      return currentMaterialDef.name;
    }

    if (!material) return "No Material";

    if (Array.isArray(material)) {
      return `${material.length} Materials`;
    }

    // Try to get a friendly name based on material type
    const materialType = material.constructor.name.replace('Mesh', '').replace('Material', '');
    return materialType || "Unknown Material";
  };

  const getMaterialTypeInfo = () => {
    if (currentMaterialDef) {
      return currentMaterialDef.type.charAt(0).toUpperCase() + currentMaterialDef.type.slice(1);
    }
    return "No Type";
  };

  return (
    <div className="space-y-2">
      <h4 className="text-gray-300 text-xs font-medium">Materials</h4>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenMaterialEditor}
        className="h-6 px-2 text-xs"
      >
        <Edit className="w-3 h-3 mr-1" />
        Edit
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xs text-gray-200">
            {getMaterialDisplayName()}
          </div>
          <div className="text-xs text-gray-500">
            {getMaterialTypeInfo()}
          </div>
        </div>

      </div>
      {currentMaterialDef && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Material: {currentMaterialDef.id}</span>
        </div>
      )}
    </div>
  );
} 