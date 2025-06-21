import React from "react";
import MaterialPreviewComponent from "@/components/material-preview";
import { MaterialDefinition } from "@/types/project";

interface MaterialPreviewProps {
  material: MaterialDefinition | null;
  size?: number;
}

export function MaterialPreview({ material, size = 200 }: MaterialPreviewProps) {
  if (!material) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-800/50"
          style={{ width: size, height: size }}
        >
          <span className="text-gray-400 text-sm">No Material</span>
        </div>
        <div className="mt-2 text-center">
          <div className="text-sm font-medium text-white">Material Preview</div>
          <div className="text-xs text-gray-400">Select a material to preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <MaterialPreviewComponent
        materialProperties={material.properties}
        size={size}
      />
      <div className="mt-2 text-center">
        <div className="text-sm font-medium text-white">{material.name}</div>
        <div className="text-xs text-gray-400">{material.type} material</div>
      </div>
    </div>
  );
} 