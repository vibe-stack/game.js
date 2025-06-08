import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function PolyhedronGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
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
        label="Detail"
        value={geometryProps.detail || 0}
        onChange={(value) => onUpdate('detail', Math.round(value))}
        step={1}
        precision={0}
        min={0}
        max={5}
      />
    </div>
  );
} 