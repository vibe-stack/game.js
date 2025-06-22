import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Box } from "@/models/primitives/box";
import { useEntityState } from "@/hooks/use-entity-state";

interface BoxPropertiesProps {
  entity: Box;
}

export function BoxProperties({ entity }: BoxPropertiesProps) {
  useEntityState(entity);

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

    if (!success) {
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

    if (!success) {
      console.warn(`Failed to update ${segmentType} segments to ${segments}`);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">Box Properties</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-gray-300 text-xs font-medium">Dimensions</h4>
          <div className="flex flex-row gap-1">
            <DragInput
              label="W"
              value={entity.width}
              onChange={(value) => handleDimensionChange('width', value)}
              step={0.1}
              precision={2}
              min={0.01}
              compact
              className="text-xs"
            />
            <DragInput
              label="H"
              value={entity.height}
              onChange={(value) => handleDimensionChange('height', value)}
              step={0.1}
              precision={2}
              min={0.01}
              compact
              className="text-xs"
            />
            <DragInput
              label="D"
              value={entity.depth}
              onChange={(value) => handleDimensionChange('depth', value)}
              step={0.1}
              precision={2}
              min={0.01}
              compact
              className="text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-gray-300 text-xs font-medium">Segments</h4>
          <div className="flex flex-row gap-1">
            <DragInput
              label="W"
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
              label="H"
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
              label="D"
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
    </div>
  );
} 