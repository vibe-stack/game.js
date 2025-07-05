import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sphere } from "@/models/primitives/sphere";
import { useEntityState } from "@/hooks/use-entity-state";

interface SpherePropertiesProps {
  entity: Sphere;
}

export function SphereProperties({ entity }: SpherePropertiesProps) {
  useEntityState(entity);

  const handleRadiusChange = (newRadius: number) => {
    const success = entity.setRadius(newRadius);
    if (!success) {
      console.warn("Could not update sphere radius:", newRadius);
    }
  };

  const handleSegmentsChange = (segments: number, type: 'width' | 'height') => {
    const segmentValue = Math.max(type === 'height' ? 2 : 3, Math.round(segments));
    let success = false;
    
    if (type === 'width') {
      success = entity.setWidthSegments(segmentValue);
    } else {
      success = entity.setHeightSegments(segmentValue);
    }
    
    if (!success) {
      console.warn(`Could not update sphere ${type} segments:`, segmentValue);
    }
  };

  const handleShadowChange = (field: 'cast' | 'receive', checked: string | boolean) => {
    const boolValue = typeof checked === 'boolean' ? checked : checked === 'true';
    if (field === 'cast') {
      entity.setShadowSettings(boolValue, entity.getMesh().receiveShadow);
    } else {
      entity.setShadowSettings(entity.getMesh().castShadow, boolValue);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">Sphere Properties</h3>
      <div className="space-y-2">
        <DragInput
          label="Radius"
          value={entity.radius}
          onChange={handleRadiusChange}
          step={0.1}
          precision={2}
          min={0.01}
          compact
          className="text-xs"
        />
        
        <DragInput
          label="Width Segments"
          value={entity.widthSegments}
          onChange={(value) => handleSegmentsChange(value, 'width')}
          step={1}
          precision={0}
          min={3}
          max={64}
          compact
          className="text-xs"
        />
        
        <DragInput
          label="Height Segments"
          value={entity.heightSegments}
          onChange={(value) => handleSegmentsChange(value, 'height')}
          step={1}
          precision={0}
          min={2}
          max={32}
          compact
          className="text-xs"
        />

        {/* Shadow Settings */}
        <div className="space-y-3">
          <h4 className="text-xs text-gray-300 font-medium">Shadows</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sphere-cast-shadow"
                checked={entity.getMesh().castShadow}
                onCheckedChange={(checked) => handleShadowChange('cast', checked as boolean)}
              />
              <Label htmlFor="sphere-cast-shadow" className="text-xs text-gray-400">Cast Shadow</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sphere-receive-shadow"
                checked={entity.getMesh().receiveShadow}
                onCheckedChange={(checked) => handleShadowChange('receive', checked as boolean)}
              />
              <Label htmlFor="sphere-receive-shadow" className="text-xs text-gray-400">Receive Shadow</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 