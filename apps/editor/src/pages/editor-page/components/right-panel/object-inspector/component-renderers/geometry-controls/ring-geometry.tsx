import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function RingGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
  return (
    <div className="space-y-2">
      <DragInput
        label="Inner Radius"
        value={geometryProps.innerRadius || 0.3}
        onChange={(value) => onUpdate('innerRadius', value)}
        step={0.1}
        precision={2}
        min={0}
      />
      <DragInput
        label="Outer Radius"
        value={geometryProps.outerRadius || 0.6}
        onChange={(value) => onUpdate('outerRadius', value)}
        step={0.1}
        precision={2}
        min={0.001}
      />
      <DragInput
        label="Theta Segments"
        value={geometryProps.thetaSegments || 32}
        onChange={(value) => onUpdate('thetaSegments', Math.round(value))}
        step={1}
        precision={0}
        min={3}
        max={64}
      />
      <DragInput
        label="Phi Segments"
        value={geometryProps.phiSegments || 1}
        onChange={(value) => onUpdate('phiSegments', Math.round(value))}
        step={1}
        precision={0}
        min={1}
        max={10}
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