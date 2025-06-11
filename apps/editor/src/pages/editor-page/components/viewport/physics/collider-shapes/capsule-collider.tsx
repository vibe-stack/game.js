import React from "react";
import { CapsuleCollider as RapierCapsuleCollider } from "@react-three/rapier";

interface CapsuleColliderProps {
  shape: { type: 'capsule'; halfHeight: number; radius: number };
  commonProps: any;
  children: React.ReactNode;
}

export default function CapsuleCollider({ shape, commonProps, children }: CapsuleColliderProps) {
  return (
    <RapierCapsuleCollider
      args={[shape.halfHeight, shape.radius]}
      {...commonProps}
    >
      {children}
    </RapierCapsuleCollider>
  );
} 