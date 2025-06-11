import React from "react";
import { TrimeshCollider as RapierTrimeshCollider } from "@react-three/rapier";
import { generateExtrudedArcTrimeshData } from "@/utils/extruded-arc-generator";
import { findObjectInScene } from "../collider-utils";

interface TrimeshColliderProps {
  shape: { type: 'trimesh'; vertices: Vector3[]; indices: number[] };
  commonProps: any;
  children: React.ReactNode;
  objectId?: string;
  currentScene?: GameScene;
}

export default function TrimeshCollider({ 
  shape, 
  commonProps, 
  children, 
  objectId, 
  currentScene 
}: TrimeshColliderProps) {
  // Auto-generate trimesh data if missing and extruded arc is available
  const enhancedShape = React.useMemo(() => {
    if (objectId && currentScene && (!shape.vertices || shape.vertices.length === 0 || !shape.indices || shape.indices.length === 0)) {
      const obj = findObjectInScene(currentScene.objects, objectId);
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

  // Validate that we have sufficient data for a trimesh
  if (!enhancedShape.vertices || enhancedShape.vertices.length < 3 || !enhancedShape.indices || enhancedShape.indices.length < 3) {
    console.warn("Trimesh collider needs at least 3 vertices and 3 indices, skipping rendering. Vertices:", enhancedShape.vertices?.length || 0, "Indices:", enhancedShape.indices?.length || 0);
    return <>{children}</>;
  }

  try {
    // Convert Vector3[] to Float32Array for vertices
    const meshVertices = new Float32Array(
      enhancedShape.vertices.flatMap((v) => [v.x, v.y, v.z]),
    );
    const indices = new Uint32Array(enhancedShape.indices);

    return (
      <RapierTrimeshCollider args={[meshVertices, indices]} {...commonProps}>
        {children}
      </RapierTrimeshCollider>
    );
  } catch (error) {
    console.error("Failed to create TrimeshCollider:", error);
    return <>{children}</>;
  }
} 