import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Box } from "@/models/primitives/box";

interface BoxPropertiesProps {
  entity: Box;
  onUpdate: () => void;
}

export function BoxProperties({ entity, onUpdate }: BoxPropertiesProps) {
  const handleDimensionChange = (dimension: 'width' | 'height' | 'depth', value: number) => {
    let success = false;
    
    switch (dimension) {
      case 'width':
        success = entity.setWidth(value);
        break;
      case 'height':
        success = entity.setHeight(value);
        break;
      case 'depth':
        success = entity.setDepth(value);
        break;
    }
    
    if (success) {
      onUpdate();
    } else {
      console.warn(`Failed to update ${dimension} to ${value}`);
    }
  };

  const handleSegmentsChange = (segmentType: 'width' | 'height' | 'depth', value: number) => {
    const segments = Math.max(1, Math.round(value));
    let success = false;
    
    switch (segmentType) {
      case 'width':
        success = entity.setWidthSegments(segments);
        break;
      case 'height':
        success = entity.setHeightSegments(segments);
        break;
      case 'depth':
        success = entity.setDepthSegments(segments);
        break;
    }
    
    if (success) {
      onUpdate();
    } else {
      console.warn(`Failed to update ${segmentType} segments to ${segments}`);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">Box Properties</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-gray-300 text-xs font-medium">Dimensions</h4>
          <DragInput
            label="Width"
            value={entity.width}
            onChange={(value) => handleDimensionChange('width', value)}
            step={0.1}
            precision={2}
            min={0.01}
            compact
            className="text-xs"
          />
          <DragInput
            label="Height"
            value={entity.height}
            onChange={(value) => handleDimensionChange('height', value)}
            step={0.1}
            precision={2}
            min={0.01}
            compact
            className="text-xs"
          />
          <DragInput
            label="Depth"
            value={entity.depth}
            onChange={(value) => handleDimensionChange('depth', value)}
            step={0.1}
            precision={2}
            min={0.01}
            compact
            className="text-xs"
          />
        </div>
        
        <div className="space-y-2">
          <h4 className="text-gray-300 text-xs font-medium">Segments</h4>
          <DragInput
            label="Width Seg"
            value={entity.segments.width}
            onChange={(value) => handleSegmentsChange('width', value)}
            step={1}
            precision={0}
            min={1}
            max={32}
            compact
            className="text-xs"
          />
          <DragInput
            label="Height Seg"
            value={entity.segments.height}
            onChange={(value) => handleSegmentsChange('height', value)}
            step={1}
            precision={0}
            min={1}
            max={32}
            compact
            className="text-xs"
          />
          <DragInput
            label="Depth Seg"
            value={entity.segments.depth}
            onChange={(value) => handleSegmentsChange('depth', value)}
            step={1}
            precision={0}
            min={1}
            max={32}
            compact
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
} 