import React from "react";
import { DragInput } from "@/components/ui/drag-input";

interface PhysicalMaterialPropertiesProps {
  properties: any;
  onChange: (properties: any) => void;
}

export function PhysicalMaterialProperties({ properties, onChange }: PhysicalMaterialPropertiesProps) {
  const handlePropertyChange = (key: string, value: any) => {
    onChange({
      ...properties,
      [key]: value
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-white">Physical Material Properties</h4>
      
      <div className="space-y-3">
        {/* Standard Material Properties */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Color</label>
          <input
            type="color"
            value={properties.color || "#ffffff"}
            onChange={(e) => handlePropertyChange("color", e.target.value)}
            className="w-full h-8 rounded border border-gray-600 bg-transparent"
          />
        </div>

        <DragInput
          label="Metalness"
          value={properties.metalness || 0}
          onChange={(value) => handlePropertyChange("metalness", value)}
          step={0.01}
          precision={2}
          min={0}
          max={1}
          compact
        />

        <DragInput
          label="Roughness"
          value={properties.roughness || 1}
          onChange={(value) => handlePropertyChange("roughness", value)}
          step={0.01}
          precision={2}
          min={0}
          max={1}
          compact
        />

        {/* Physical Properties */}
        <div className="border-t border-gray-700 pt-3 mt-4">
          <h5 className="text-xs font-medium text-gray-300 mb-3">Physical Properties</h5>
          
          {/* Clearcoat */}
          <DragInput
            label="Clearcoat"
            value={properties.clearcoat || 0}
            onChange={(value) => handlePropertyChange("clearcoat", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
          />

          <DragInput
            label="Clearcoat Roughness"
            value={properties.clearcoatRoughness || 0}
            onChange={(value) => handlePropertyChange("clearcoatRoughness", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
          />

          {/* IOR */}
          <DragInput
            label="IOR"
            value={properties.ior || 1.5}
            onChange={(value) => handlePropertyChange("ior", value)}
            step={0.01}
            precision={2}
            min={1}
            max={3}
            compact
          />

          {/* Transmission */}
          <DragInput
            label="Transmission"
            value={properties.transmission || 0}
            onChange={(value) => handlePropertyChange("transmission", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
          />

          <DragInput
            label="Thickness"
            value={properties.thickness || 0}
            onChange={(value) => handlePropertyChange("thickness", value)}
            step={0.01}
            precision={2}
            min={0}
            max={5}
            compact
          />

          {/* Iridescence */}
          <DragInput
            label="Iridescence"
            value={properties.iridescence || 0}
            onChange={(value) => handlePropertyChange("iridescence", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
          />

          <DragInput
            label="Iridescence IOR"
            value={properties.iridescenceIOR || 1.3}
            onChange={(value) => handlePropertyChange("iridescenceIOR", value)}
            step={0.01}
            precision={2}
            min={1}
            max={3}
            compact
          />

          {/* Sheen */}
          <DragInput
            label="Sheen"
            value={properties.sheen || 0}
            onChange={(value) => handlePropertyChange("sheen", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
          />

          <div>
            <label className="block text-xs text-gray-400 mb-1">Sheen Color</label>
            <input
              type="color"
              value={properties.sheenColor || "#ffffff"}
              onChange={(e) => handlePropertyChange("sheenColor", e.target.value)}
              className="w-full h-8 rounded border border-gray-600 bg-transparent"
            />
          </div>

          <DragInput
            label="Sheen Roughness"
            value={properties.sheenRoughness || 1}
            onChange={(value) => handlePropertyChange("sheenRoughness", value)}
            step={0.01}
            precision={2}
            min={0}
            max={1}
            compact
          />
        </div>

        {/* Common Properties */}
        <div className="border-t border-gray-700 pt-3 mt-4">
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
    </div>
  );
} 