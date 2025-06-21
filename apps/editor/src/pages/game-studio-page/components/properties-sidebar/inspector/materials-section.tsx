import React from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Entity } from "@/models";
import { Mesh3D } from "@/models/primitives/mesh-3d";
import useGameStudioStore from "@/stores/game-studio-store";

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

  const handleOpenMaterialEditor = () => {
    setMaterialEditorEntity(entity.id.toString());
    setMaterialEditorOpen(true);
  };

  const getMaterialDisplayName = () => {
    if (!material) return "No Material";
    
    if (Array.isArray(material)) {
      return `${material.length} Materials`;
    }
    
    // Try to get a friendly name based on material type
    const materialType = material.constructor.name.replace('Mesh', '').replace('Material', '');
    return materialType || "Unknown Material";
  };

  return (
    <div className="space-y-2">
      <h4 className="text-gray-300 text-xs font-medium">Materials</h4>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-xs text-gray-400">
          {getMaterialDisplayName()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenMaterialEditor}
          className="h-6 px-2 text-xs"
        >
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  );
} 