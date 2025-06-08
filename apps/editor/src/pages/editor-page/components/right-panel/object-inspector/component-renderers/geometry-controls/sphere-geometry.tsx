import React from "react";
import { DragInput } from "@/components/ui/drag-input";
import { GeometryControlProps } from "./types";

export default function SphereGeometry({ geometryProps, onUpdate }: GeometryControlProps) {
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
        label="Width Segments"
        value={geometryProps.widthSegments || 32}
        onChange={(value) => onUpdate('widthSegments', Math.round(value))}
        step={1}
        precision={0}
        min={3}
        max={64}
      />
      <DragInput
        label="Height Segments"
        value={geometryProps.heightSegments || 16}
        onChange={(value) => onUpdate('heightSegments', Math.round(value))}
        step={1}
        precision={0}
        min={2}
        max={32}
      />
      <DragInput
        label="Phi Start"
        value={geometryProps.phiStart || 0}
        onChange={(value) => onUpdate('phiStart', value)}
        step={0.1}
        precision={2}
        min={0}
        max={Math.PI * 2}
      />
      <DragInput
        label="Phi Length"
        value={geometryProps.phiLength || Math.PI * 2}
        onChange={(value) => onUpdate('phiLength', value)}
        step={0.1}
        precision={2}
        min={0}
        max={Math.PI * 2}
      />
      <DragInput
        label="Theta Start"
        value={geometryProps.thetaStart || 0}
        onChange={(value) => onUpdate('thetaStart', value)}
        step={0.1}
        precision={2}
        min={0}
        max={Math.PI}
      />
      <DragInput
        label="Theta Length"
        value={geometryProps.thetaLength || Math.PI}
        onChange={(value) => onUpdate('thetaLength', value)}
        step={0.1}
        precision={2}
        min={0}
        max={Math.PI}
      />
    </div>
  );
} 