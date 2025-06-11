import React from "react";
import { BallCollider } from "@react-three/rapier";

interface SphereColliderProps {
  shape: { type: 'sphere'; radius: number };
  commonProps: any;
  children: React.ReactNode;
}

export default function SphereCollider({ shape, commonProps, children }: SphereColliderProps) {
  return (
    <BallCollider args={[shape.radius]} {...commonProps}>
      {children}
    </BallCollider>
  );
} 