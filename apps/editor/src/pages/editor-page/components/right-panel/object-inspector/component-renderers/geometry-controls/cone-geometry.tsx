import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function ConeGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
  return (
    <div className="space-y-2">
      <DragInput
        label="Radius"
        value={geometryProps.radius || 0.5}
        onChange={(value) => onUpdate('radius', value)}
        step={0.1}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Height"
        value={geometryProps.height || 1}
        onChange={(value) => onUpdate('height', value)}
        step={0.1}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Radial Segments"
        value={geometryProps.radialSegments || 32}
        onChange={(value) => onUpdate('radialSegments', Math.round(value))}
        step={1}
        precision={0}
        min={3}
        max={64}
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