import React from 'react';
import { CuboidCollider, BallCollider, CapsuleCollider, CylinderCollider, ConvexHullCollider, TrimeshCollider } from '@react-three/rapier';

interface ColliderRendererProps {
  colliderComponent: ColliderComponent;
  children: React.ReactNode;
  transform?: Transform; // Add transform prop for standalone colliders
}

// Map combine rules to rapier constants
const mapCombineRule = (rule: string) => {
  switch (rule) {
    case 'average': return 0; // Average
    case 'min': return 1; // Min
    case 'multiply': return 2; // Multiply
    case 'max': return 3; // Max
    default: return 0; // Default to average
  }
};

// Helper function to pack collision groups (membership and filter) into a single number
// Following Rapier's format: 16 left-most bits = membership, 16 right-most bits = filter
const packCollisionGroups = (membership: number, filter: number): number => {
  return (membership << 16) | (filter & 0xFFFF);
};

export default function ColliderRenderer({ colliderComponent, children, transform }: ColliderRendererProps) {
  if (!colliderComponent.enabled) {
    return <>{children}</>;
  }

  const props = colliderComponent.properties;
  const shape = props.shape;

  // Pack collision groups properly
  const packedCollisionGroups = packCollisionGroups(
    props.collisionGroups.membership, 
    props.collisionGroups.filter
  );
  const packedSolverGroups = packCollisionGroups(
    props.solverGroups.membership, 
    props.solverGroups.filter
  );

  // Common props for all colliders
  const commonProps = {
    sensor: props.isSensor,
    density: props.density,
    friction: props.material.friction,
    restitution: props.material.restitution,
    frictionCombineRule: mapCombineRule(props.material.frictionCombineRule),
    restitutionCombineRule: mapCombineRule(props.material.restitutionCombineRule),
    collisionGroups: packedCollisionGroups,
    solverGroups: packedSolverGroups,
    contactForceEventThreshold: props.contactForceEventThreshold,
    // Apply transform to standalone colliders (when not part of a rigid body)
    ...(transform && {
      position: [transform.position.x, transform.position.y, transform.position.z] as [number, number, number],
      rotation: [transform.rotation.x, transform.rotation.y, transform.rotation.z] as [number, number, number],
    })
  };

  // Render different collider types based on shape
  try {
    switch (shape.type) {
      case 'box': {
        return (
          <CuboidCollider
            args={[shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z]}
            {...commonProps}
          >
            {children}
          </CuboidCollider>
        );
      }

      case 'sphere': {
        return (
          <BallCollider
            args={[shape.radius]}
            {...commonProps}
          >
            {children}
          </BallCollider>
        );
      }

      case 'capsule': {
        return (
          <CapsuleCollider
            args={[shape.halfHeight, shape.radius]}
            {...commonProps}
          >
            {children}
          </CapsuleCollider>
        );
      }

      case 'cylinder': {
        return (
          <CylinderCollider
            args={[shape.height / 2, shape.radius]}
            {...commonProps}
          >
            {children}
          </CylinderCollider>
        );
      }

      case 'convexHull': {
        // Convert Vector3[] to Float32Array
        const vertices = new Float32Array(shape.vertices.flatMap(v => [v.x, v.y, v.z]));
        return (
          <ConvexHullCollider
            args={[vertices]}
            {...commonProps}
          >
            {children}
          </ConvexHullCollider>
        );
      }

      case 'trimesh': {
        // Convert Vector3[] to Float32Array for vertices
        const meshVertices = new Float32Array(shape.vertices.flatMap(v => [v.x, v.y, v.z]));
        const indices = new Uint32Array(shape.indices);
        return (
          <TrimeshCollider
            args={[meshVertices, indices]}
            {...commonProps}
          >
            {children}
          </TrimeshCollider>
        );
      }

      default:
        console.warn(`Unsupported collider shape type: ${shape.type}`);
        return <>{children}</>;
    }
  } catch (error) {
    console.warn('Failed to create collider:', error);
    return <>{children}</>;
  }
} 