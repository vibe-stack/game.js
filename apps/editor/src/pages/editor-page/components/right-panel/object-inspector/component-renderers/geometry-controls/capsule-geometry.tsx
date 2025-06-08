import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function CapsuleGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
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
        label="Length"
        value={geometryProps.length || 1}
        onChange={(value) => onUpdate('length', value)}
        step={0.1}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Cap Segments"
        value={geometryProps.capSegments || 4}
        onChange={(value) => onUpdate('capSegments', Math.round(value))}
        step={1}
        precision={0}
        min={1}
        max={16}
      />
      <DragInput
        label="Radial Segments"
        value={geometryProps.radialSegments || 8}
        onChange={(value) => onUpdate('radialSegments', Math.round(value))}
        step={1}
        precision={0}
        min={3}
        max={32}
      />
    </div>
  );
} 