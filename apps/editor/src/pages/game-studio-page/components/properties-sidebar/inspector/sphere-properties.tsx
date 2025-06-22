import React from "react";
import { DragInput } from "@/components/ui/drag-input";
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
          value={entity.segments.width}
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
          value={entity.segments.height}
          onChange={(value) => handleSegmentsChange(value, 'height')}
          step={1}
          precision={0}
          min={2}
          max={32}
          compact
          className="text-xs"
        />
      </div>
    </div>
  );
} 