import React from "react";
import { DragInput } from "@/components/ui/drag-input";

interface LambertMaterialPropertiesProps {
  properties: any;
  onChange: (properties: any) => void;
}

export function LambertMaterialProperties({ properties, onChange }: LambertMaterialPropertiesProps) {
  const handlePropertyChange = (key: string, value: any) => {
    onChange({
      ...properties,
      [key]: value
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-white">Lambert Material Properties</h4>
      
      <div className="space-y-3">
        {/* Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Color</label>
          <input
            type="color"
            value={properties.color || "#ffffff"}
            onChange={(e) => handlePropertyChange("color", e.target.value)}
            className="w-full h-8 rounded border border-gray-600 bg-transparent"
          />
        </div>

        {/* Emissive Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Emissive Color</label>
          <input
            type="color"
            value={properties.emissive || "#000000"}
            onChange={(e) => handlePropertyChange("emissive", e.target.value)}
            className="w-full h-8 rounded border border-gray-600 bg-transparent"
          />
        </div>

        {/* Emissive Intensity */}
        <DragInput
          label="Emissive Intensity"
          value={properties.emissiveIntensity || 0}
          onChange={(value) => handlePropertyChange("emissiveIntensity", value)}
          step={0.1}
          precision={1}
          min={0}
          max={10}
          compact
        />

        {/* Opacity */}
        <DragInput
          label="Opacity"
          value={properties.opacity || 1}
          onChange={(value) => handlePropertyChange("opacity", value)}
          step={0.01}
          precision={2}
          min={0}
          max={1}
          compact
        />

        {/* Wireframe */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="wireframe"
            checked={properties.wireframe || false}
            onChange={(e) => handlePropertyChange("wireframe", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="wireframe" className="text-xs text-gray-400">Wireframe</label>
        </div>

        {/* Transparent */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="transparent"
            checked={properties.transparent || false}
            onChange={(e) => handlePropertyChange("transparent", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="transparent" className="text-xs text-gray-400">Transparent</label>
        </div>
      </div>
    </div>
  );
} 