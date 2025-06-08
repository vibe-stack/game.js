import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function PlaneGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
  return (
    <div className="space-y-2">
      <DragInput
        label="Width"
        value={geometryProps.width || 2}
        onChange={(value) => onUpdate('width', value)}
        step={0.1}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Height"
        value={geometryProps.height || 2}
        onChange={(value) => onUpdate('height', value)}
        step={0.1}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Width Segments"
        value={geometryProps.widthSegments || 1}
        onChange={(value) => onUpdate('widthSegments', Math.round(value))}
        step={1}
        precision={0}
        min={1}
        max={20}
      />
      <DragInput
        label="Height Segments"
        value={geometryProps.heightSegments || 1}
        onChange={(value) => onUpdate('heightSegments', Math.round(value))}
        step={1}
        precision={0}
        min={1}
        max={20}
      />
    </div>
  );
} 