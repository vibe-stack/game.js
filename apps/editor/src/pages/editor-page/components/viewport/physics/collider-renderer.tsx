import React from "react";
import {
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  CylinderCollider,
  ConvexHullCollider,
  TrimeshCollider,
  HeightfieldCollider,
} from "@react-three/rapier";

interface ColliderRendererProps {
  colliderComponent: ColliderComponent;
  children: React.ReactNode;
  transform?: Transform; // Add transform prop for standalone colliders
}

// Map combine rules to rapier constants
const mapCombineRule = (rule: string) => {
  switch (rule) {
    case "average":
      return 0; // Average
    case "min":
      return 1; // Min
    case "multiply":
      return 2; // Multiply
    case "max":
      return 3; // Max
    default:
      return 0; // Default to average
  }
};

// Helper function to pack collision groups (membership and filter) into a single number
// Following Rapier's format: 16 left-most bits = membership, 16 right-most bits = filter
const packCollisionGroups = (membership: number, filter: number): number => {
  return (membership << 16) | (filter & 0xffff);
};

export default function ColliderRenderer({
  colliderComponent,
  children,
}: ColliderRendererProps) {
  if (!colliderComponent.enabled) {
    return <>{children}</>;
  }

  const props = colliderComponent.properties;
  const shape = props.shape;

  // Pack collision groups properly
  const packedCollisionGroups = packCollisionGroups(
    props.collisionGroups.membership,
    props.collisionGroups.filter,
  );
  const packedSolverGroups = packCollisionGroups(
    props.solverGroups.membership,
    props.solverGroups.filter,
  );

  // Common props for all colliders
  const commonProps = {
    sensor: props.isSensor,
    density: props.density,
    friction: props.material.friction,
    restitution: props.material.restitution,
    frictionCombineRule: mapCombineRule(props.material.frictionCombineRule),
    restitutionCombineRule: mapCombineRule(
      props.material.restitutionCombineRule,
    ),
    collisionGroups: packedCollisionGroups,
    solverGroups: packedSolverGroups,
    contactForceEventThreshold: props.contactForceEventThreshold,
  };

  // Render different collider types based on shape
  try {
    switch (shape.type) {
      case "box": {
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

      case "sphere": {
        return (
          <BallCollider args={[shape.radius]} {...commonProps}>
            {children}
          </BallCollider>
        );
      }

      case "capsule": {
        return (
          <CapsuleCollider
            args={[shape.halfHeight, shape.radius]}
            {...commonProps}
          >
            {children}
          </CapsuleCollider>
        );
      }

      case "cylinder": {
        return (
          <CylinderCollider
            args={[shape.height / 2, shape.radius]}
            {...commonProps}
          >
            {children}
          </CylinderCollider>
        );
      }

      case "convexHull": {
        // Convert Vector3[] to Float32Array
        const vertices = new Float32Array(
          shape.vertices.flatMap((v) => [v.x, v.y, v.z]),
        );
        return (
          <ConvexHullCollider args={[vertices]} {...commonProps}>
            {children}
          </ConvexHullCollider>
        );
      }

      case "trimesh": {
        // Convert Vector3[] to Float32Array for vertices
        const meshVertices = new Float32Array(
          shape.vertices.flatMap((v) => [v.x, v.y, v.z]),
        );
        const indices = new Uint32Array(shape.indices);
        return (
          <TrimeshCollider args={[meshVertices, indices]} {...commonProps}>
            {children}
          </TrimeshCollider>
        );
      }

      case "heightfield": {
        // HeightfieldCollider expects heights as (width + 1) * (depth + 1) values
        // The 2D array heights[z][x] needs to be flattened to match this format
        const heights2D = shape.heights || [
          [0, 0],
          [0, 0],
        ];
        const depth = heights2D.length - 1; // number of rows - 1
        const width = (heights2D[0]?.length || 2) - 1; // number of columns - 1

        if (depth < 1 || width < 1) {
          console.warn(
            "Heightfield collider needs at least 2x2 height samples",
          );
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
          <HeightfieldCollider
            args={[width, depth, transposedHeights, scale]}
            {...commonProps}
          >
            {children}
          </HeightfieldCollider>
        );
      }

      default:
        console.warn(`Unsupported collider shape type: ${shape.type}`);
        return <>{children}</>;
    }
  } catch (error) {
    console.warn("Failed to create collider:", error);
    return <>{children}</>;
  }
}
