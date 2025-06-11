import React from "react";
import { CylinderCollider as RapierCylinderCollider } from "@react-three/rapier";

interface CylinderColliderProps {
  shape: { type: 'cylinder'; height: number; radius: number };
  commonProps: any;
  children: React.ReactNode;
}

export default function CylinderCollider({ shape, commonProps, children }: CylinderColliderProps) {
  return (
    <RapierCylinderCollider
      args={[shape.height / 2, shape.radius]}
      {...commonProps}
    >
      {children}
    </RapierCylinderCollider>
  );
} 