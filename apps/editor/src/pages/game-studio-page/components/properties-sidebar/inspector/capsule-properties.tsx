import React from "react";
import { Capsule } from "@/models/primitives/capsule";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEntityState } from "@/hooks/use-entity-state";

interface CapsulePropertiesProps {
  entity: Capsule;
}

export function CapsuleProperties({ entity }: CapsulePropertiesProps) {
  useEntityState(entity);
  const handleDimensionChange = (field: 'radius' | 'length', value: number) => {
    if (field === 'radius') {
      entity.setDimensions(value, entity.length);
    } else {
      entity.setDimensions(entity.radius, value);
    }
  };

  const handleSegmentChange = (field: 'cap' | 'radial', value: number) => {
    const intValue = Math.max(1, Math.round(value));
    if (field === 'cap') {
      entity.setSegments(intValue, entity.segments.radial);
    } else {
      entity.setSegments(entity.segments.cap, intValue);
    }
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
        Capsule Properties
      </h3>
      
      {/* Dimensions */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Dimensions</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="capsule-radius" className="text-xs text-gray-400">Radius</Label>
            <DragInput
              id="capsule-radius"
              value={entity.radius}
              onChange={(value) => handleDimensionChange('radius', value)}
              min={0.01}
              step={0.1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="capsule-length" className="text-xs text-gray-400">Length</Label>
            <DragInput
              id="capsule-length"
              value={entity.length}
              onChange={(value) => handleDimensionChange('length', value)}
              min={0.01}
              step={0.1}
              className="text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">
            Total Height: {entity.totalHeight.toFixed(2)}
          </Label>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Segments</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="capsule-cap-segments" className="text-xs text-gray-400">Cap Segments</Label>
            <DragInput
              id="capsule-cap-segments"
              value={entity.segments.cap}
              onChange={(value) => handleSegmentChange('cap', value)}
              min={1}
              max={32}
              step={1}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="capsule-radial-segments" className="text-xs text-gray-400">Radial Segments</Label>
            <DragInput
              id="capsule-radial-segments"
              value={entity.segments.radial}
              onChange={(value) => handleSegmentChange('radial', value)}
              min={3}
              max={64}
              step={1}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Shadow Settings */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="capsule-cast-shadow"
              checked={entity.getMesh().castShadow}
              onCheckedChange={(checked) => handleShadowChange('cast', checked as boolean)}
            />
            <Label htmlFor="capsule-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="capsule-receive-shadow"
              checked={entity.getMesh().receiveShadow}
              onCheckedChange={(checked) => handleShadowChange('receive', checked as boolean)}
            />
            <Label htmlFor="capsule-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
          </div>
        </div>
      </div>
    </div>
  );
} 