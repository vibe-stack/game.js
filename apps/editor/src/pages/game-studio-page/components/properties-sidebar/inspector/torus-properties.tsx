import React from "react";
import { Torus } from "@/models/primitives/torus";
import { useEntityState } from "@/hooks/use-entity-state";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TorusPropertiesProps {
  entity: Torus;
}

export function TorusProperties({ entity }: TorusPropertiesProps) {
  useEntityState(entity);

  const handleDimensionChange = (field: 'radius' | 'tube', value: number) => {
    if (field === 'radius') {
      entity.setDimensions(value, entity.tube);
    } else {
      entity.setDimensions(entity.radius, value);
    }
  };

  const handleSegmentChange = (field: 'radial' | 'tubular', value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === 'radial') {
      entity.setSegments(intValue, entity.segmentConfig.tubular);
    } else {
      entity.setSegments(entity.segmentConfig.radial, intValue);
    }
  };

  const handleArcChange = (value: number) => {
    entity.setArc(value);
  };

  const handleShadowChange = (field: 'cast' | 'receive', checked: boolean) => {
    if (field === 'cast') {
      entity.setShadowSettings(checked, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, checked);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
        Torus Properties
      </h3>
      
      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="torus-radius" className="text-xs text-gray-400">Radius</Label>
            <DragInput
              id="torus-radius"
              value={entity.radius}
              onChange={(value) => handleDimensionChange('radius', value)}
              min={0.01}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="torus-tube" className="text-xs text-gray-400">Tube</Label>
            <DragInput
              id="torus-tube"
              value={entity.tube}
              onChange={(value) => handleDimensionChange('tube', value)}
              min={0.01}
              step={0.05}
              className="text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-500">
              Outer: {entity.outerRadius.toFixed(2)}
            </Label>
          </div>
          <div>
            <Label className="text-xs text-gray-500">
              Inner: {entity.innerRadius.toFixed(2)}
            </Label>
          </div>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Segments</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="torus-radial-segments" className="text-xs text-gray-400">Radial</Label>
            <DragInput
              id="torus-radial-segments"
              value={entity.segmentConfig.radial}
              onChange={(value) => handleSegmentChange('radial', value)}
              min={3}
              max={64}
              step={1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="torus-tubular-segments" className="text-xs text-gray-400">Tubular</Label>
            <DragInput
              id="torus-tubular-segments"
              value={entity.segmentConfig.tubular}
              onChange={(value) => handleSegmentChange('tubular', value)}
              min={3}
              max={200}
              step={1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Arc Configuration */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Arc Configuration</h4>
        <div>
          <Label htmlFor="torus-arc" className="text-xs text-gray-400">Arc (radians)</Label>
          <DragInput
            id="torus-arc"
            value={entity.segmentConfig.arc}
            onChange={handleArcChange}
            min={0.1}
            max={Math.PI * 2}
            step={0.1}
            className="text-xs"
          />
          <Label className="text-xs text-gray-500">
            Degrees: {(entity.segmentConfig.arc * 180 / Math.PI).toFixed(1)}°
          </Label>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="torus-cast-shadow"
              checked={entity.getMesh().castShadow}
              onCheckedChange={(checked) => handleShadowChange('cast', !!checked)}
            />
            <Label htmlFor="torus-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="torus-receive-shadow"
              checked={entity.getMesh().receiveShadow}
              onCheckedChange={(checked) => handleShadowChange('receive', !!checked)}
            />
            <Label htmlFor="torus-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 