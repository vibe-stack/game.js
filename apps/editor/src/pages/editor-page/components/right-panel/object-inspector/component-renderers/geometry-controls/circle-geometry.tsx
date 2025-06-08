import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function CircleGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
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
        label="Segments"
        value={geometryProps.segments || 32}
        onChange={(value) => onUpdate('segments', Math.round(value))}
        step={1}
        precision={0}
        min={3}
        max={64}
      />
      <DragInput
        label="Theta Start"
        value={geometryProps.thetaStart || 0}
        onChange={(value) => onUpdate('thetaStart', value)}
        step={0.1}
        precision={2}
        min={0}
        max={Math.PI * 2}
      />
      <DragInput
        label="Theta Length"
        value={geometryProps.thetaLength || Math.PI * 2}
        onChange={(value) => onUpdate('thetaLength', value)}
        step={0.1}
        precision={2}
        min={0}
        max={Math.PI * 2}
      />
    </div>
  );
} 