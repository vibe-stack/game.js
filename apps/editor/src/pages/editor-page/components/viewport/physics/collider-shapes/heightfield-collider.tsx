import React from "react";
import { HeightfieldCollider as RapierHeightfieldCollider } from "@react-three/rapier";

interface HeightfieldColliderProps {
  shape: { type: 'heightfield'; heights: number[][]; scale: Vector3 };
  commonProps: any;
  children: React.ReactNode;
}

export default function HeightfieldCollider({ shape, commonProps, children }: HeightfieldColliderProps) {
  // HeightfieldCollider expects heights as (width + 1) * (depth + 1) values
  // The 2D array heights[z][x] needs to be flattened to match this format
  const heights2D = shape.heights || [
    [0, 0],
    [0, 0],
  ];
  const depth = heights2D.length - 1; // number of rows - 1
  const width = (heights2D[0]?.length || 2) - 1; // number of columns - 1

  if (depth < 1 || width < 1) {
    console.warn("Heightfield collider needs at least 2x2 height samples");
    return <>{children}</>;
  }

  // Transpose the height data to match coordinate system
  // Convert from heights[z][x] to heights[x][z] and then flatten
  const transposedHeights = [];
  for (let x = 0; x <= width; x++) {
    for (let z = 0; z <= depth; z++) {
      transposedHeights.push(heights2D[z][x]);
    }
  }

  const scale = shape.scale;

  return (
    <RapierHeightfieldCollider
      args={[width, depth, transposedHeights, scale]}
      {...commonProps}
    >
      {children}
    </RapierHeightfieldCollider>
  );
} 