import React, { useMemo } from "react";
import {
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  CylinderCollider,
  ConvexHullCollider,
  TrimeshCollider,
  HeightfieldCollider,
} from "@react-three/rapier";
import { generateExtrudedArcColliderVertices } from "@/utils/extruded-arc-generator";
import { generateExtrudedArcTrimeshData } from "@/utils/extruded-arc-generator";
import useEditorStore from "@/stores/editor-store";

interface ColliderRendererProps {
  colliderComponent: ColliderComponent;
  children: React.ReactNode;
  transform?: Transform; // Add transform prop for standalone colliders
  objectId?: string; // Add objectId to access the parent object components
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
  objectId,
}: ColliderRendererProps) {
  const { currentScene } = useEditorStore();
  
  if (!colliderComponent.enabled) {
    return <>{children}</>;
  }

  const props = colliderComponent.properties;
  const shape = props.shape;

  // Auto-generate convex hull vertices if missing and extruded arc is available
  const enhancedShape = useMemo(() => {
    if (shape.type === 'convexHull' && objectId && currentScene && (!shape.vertices || shape.vertices.length === 0)) {
      // Find the object in the scene
      const findObject = (objects: GameObject[]): GameObject | null => {
        for (const obj of objects) {
          if (obj.id === objectId) return obj;
          const found = findObject(obj.children);
          if (found) return found;
        }
        return null;
      };

      const obj = findObject(currentScene.objects);
      if (obj) {
        const extrudedArcComp = obj.components.find(c => c.type === 'extrudedArc') as ExtrudedArcComponent;
        if (extrudedArcComp) {
          try {
            const vertices = generateExtrudedArcColliderVertices(extrudedArcComp.properties);
            return { ...shape, vertices };
          } catch (error) {
            console.warn('Failed to auto-generate vertices in renderer:', error);
          }
        }
      }
    }
    
    if (shape.type === 'trimesh' && objectId && currentScene && (!shape.vertices || shape.vertices.length === 0 || !shape.indices || shape.indices.length === 0)) {
      // Find the object in the scene
      const findObject = (objects: GameObject[]): GameObject | null => {
        for (const obj of objects) {
          if (obj.id === objectId) return obj;
          const found = findObject(obj.children);
          if (found) return found;
        }
        return null;
      };

      const obj = findObject(currentScene.objects);
      if (obj) {
        const extrudedArcComp = obj.components.find(c => c.type === 'extrudedArc') as ExtrudedArcComponent;
        if (extrudedArcComp) {
          try {
            const { vertices: flatVertices, indices } = generateExtrudedArcTrimeshData(extrudedArcComp.properties);
            
            // Convert flat array to Vector3 objects
            const vertices = [];
            for (let i = 0; i < flatVertices.length; i += 3) {
              vertices.push({
                x: flatVertices[i],
                y: flatVertices[i + 1],
                z: flatVertices[i + 2]
              });
            }
            
            return { ...shape, vertices, indices };
          } catch (error) {
            console.warn('Failed to auto-generate trimesh data:', error);
          }
        }
      }
    }
    
    return shape;
  }, [shape, objectId, currentScene]);

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
        // Use enhanced shape which may have auto-generated vertices
        const convexHullShape = enhancedShape.type === 'convexHull' ? enhancedShape : shape as { type: 'convexHull'; vertices: Vector3[] };
        
        // Convert Vector3[] to Float32Array
        
        // Validate that we have sufficient vertices for a convex hull (minimum 4 vertices)
        if (!convexHullShape.vertices || convexHullShape.vertices.length < 4) {
          console.warn("ConvexHull collider needs at least 4 vertices, skipping rendering. Current count:", convexHullShape.vertices?.length || 0);
          // Return children without collider to avoid breaking the component tree
          return <>{children}</>;
        }
        
        try {
          const vertices = new Float32Array(
            convexHullShape.vertices.flatMap((v) => [v.x, v.y, v.z]),
          );
          
          return (
            <ConvexHullCollider args={[vertices]} {...commonProps}>
              {children}
            </ConvexHullCollider>
          );
        } catch (error) {
          console.error("Failed to create ConvexHullCollider:", error);
          return <>{children}</>;
        }
      }

      case "trimesh": {
        // Use enhanced shape which may have auto-generated data
        const trimeshShape = enhancedShape.type === 'trimesh' ? enhancedShape : shape as { type: 'trimesh'; vertices: Vector3[]; indices: number[] };
        
        
        // Validate that we have sufficient data for a trimesh
        if (!trimeshShape.vertices || trimeshShape.vertices.length < 3 || !trimeshShape.indices || trimeshShape.indices.length < 3) {
          console.warn("Trimesh collider needs at least 3 vertices and 3 indices, skipping rendering. Vertices:", trimeshShape.vertices?.length || 0, "Indices:", trimeshShape.indices?.length || 0);
          return <>{children}</>;
        }
        
        try {
          // Convert Vector3[] to Float32Array for vertices
          const meshVertices = new Float32Array(
            trimeshShape.vertices.flatMap((v) => [v.x, v.y, v.z]),
          );
          const indices = new Uint32Array(trimeshShape.indices);
          
          return (
            <TrimeshCollider args={[meshVertices, indices]} {...commonProps}>
              {children}
            </TrimeshCollider>
          );
        } catch (error) {
          console.error("Failed to create TrimeshCollider:", error);
          return <>{children}</>;
        }
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