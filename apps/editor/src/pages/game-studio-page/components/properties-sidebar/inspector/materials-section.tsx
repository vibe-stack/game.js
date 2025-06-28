import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Palette, Info, Sparkles } from "lucide-react";
import { Entity } from "@/models";
import useGameStudioStore from "@/stores/game-studio-store";
import { MaterialApplicationService } from "../../material-editor/material-application-service";

interface MaterialsSectionProps {
  entity: Entity;
}

export function MaterialsSection({ entity }: MaterialsSectionProps) {
  const { setMaterialEditorOpen, setMaterialEditorEntity, setShaderEditorOpen, setShaderEditorEntity } = useGameStudioStore();

  // Check if entity has material support
  const hasMaterialSupport = 'getMaterial' in entity && 'setMaterial' in entity;
  const material = hasMaterialSupport ? (entity as any).getMaterial() : null;

  // Get current material definition if available
  const currentMaterialDef = React.useMemo(() => {
    if (!hasMaterialSupport) return null;
    return MaterialApplicationService.getCurrentMaterialFromEntity(entity);
  }, [entity, material, hasMaterialSupport]);

  const handleOpenMaterialEditor = () => {
    if (!hasMaterialSupport) return;
    setMaterialEditorEntity(entity.entityId.toString());
    setMaterialEditorOpen(true);
  };

  const getMaterialDisplayInfo = () => {
    if (!hasMaterialSupport) {
      return {
        name: "No Material Support",
        type: "N/A",
        description: "This entity type doesn't support materials"
      };
    }

    if (currentMaterialDef) {
      return {
        name: currentMaterialDef.name,
        type: currentMaterialDef.type.charAt(0).toUpperCase() + currentMaterialDef.type.slice(1),
        description: `Using ${currentMaterialDef.type} material`
      };
    }

    if (!material) {
      return {
        name: "No Material Assigned",
        type: "None",
        description: "Click Edit to assign a material"
      };
    }

    if (Array.isArray(material)) {
      return {
        name: `${material.length} Materials`,
        type: "Multiple",
        description: `${material.length} materials assigned`
      };
    }

    // Try to get a friendly name based on material type
    const materialType = material.constructor.name.replace('Mesh', '').replace('Material', '');
    return {
      name: materialType || "Unknown Material",
      type: materialType || "Unknown",
      description: "Material assigned directly"
    };
  };

  const materialInfo = getMaterialDisplayInfo();

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
        Material
      </h3>
      
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {materialInfo.name.slice(0, 15)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="text-white">{materialInfo.type}</span>
            </div>
            <div className="text-gray-500 mt-1">
              {materialInfo.description}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenMaterialEditor}
              disabled={!hasMaterialSupport}
              className="flex-1 h-8 text-xs"
            >
              <Edit className="w-3 h-3 mr-2" />
              {hasMaterialSupport ? "Edit Material" : "Not Supported"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShaderEditorEntity(entity.entityId.toString());
                setShaderEditorOpen(true);
              }}
              className="h-8 text-xs"
              title="Open Shader Editor"
            >
              <Sparkles className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 