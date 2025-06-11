import React from "react";
import { CuboidCollider } from "@react-three/rapier";

interface BoxColliderProps {
  shape: { type: 'box'; halfExtents: Vector3 };
  commonProps: any;
  children: React.ReactNode;
}

export default function BoxCollider({ shape, commonProps, children }: BoxColliderProps) {
  return (
    <CuboidCollider
      args={[
        shape.halfExtents.x,
        shape.halfExtents.y,
        shape.halfExtents.z,
      ]}
      {...commonProps}
    >
      {children}
    </CuboidCollider>
  );
} 