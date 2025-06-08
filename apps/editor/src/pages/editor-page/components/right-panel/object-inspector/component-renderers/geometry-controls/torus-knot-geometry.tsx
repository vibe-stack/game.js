import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function TorusKnotGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
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
        label="Tube"
        value={geometryProps.tube || 0.15}
        onChange={(value) => onUpdate('tube', value)}
        step={0.01}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Tubular Segments"
        value={geometryProps.tubularSegments || 64}
        onChange={(value) => onUpdate('tubularSegments', Math.round(value))}
        step={1}
        precision={0}
        min={3}
        max={200}
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
      <DragInput
        label="P"
        value={geometryProps.p || 2}
        onChange={(value) => onUpdate('p', Math.round(value))}
        step={1}
        precision={0}
        min={1}
        max={10}
      />
      <DragInput
        label="Q"
        value={geometryProps.q || 3}
        onChange={(value) => onUpdate('q', Math.round(value))}
        step={1}
        precision={0}
        min={1}
        max={10}
      />
    </div>
  );
} 