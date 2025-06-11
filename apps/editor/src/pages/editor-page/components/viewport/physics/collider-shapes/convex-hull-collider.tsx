import React from "react";
import { ConvexHullCollider as RapierConvexHullCollider } from "@react-three/rapier";
import { generateExtrudedArcColliderVertices } from "@/utils/extruded-arc-generator";
import { findObjectInScene } from "../collider-utils";

interface ConvexHullColliderProps {
  shape: { type: 'convexHull'; vertices: Vector3[] };
  commonProps: any;
  children: React.ReactNode;
  objectId?: string;
  currentScene?: GameScene;
}

export default function ConvexHullCollider({ 
  shape, 
  commonProps, 
  children, 
  objectId, 
  currentScene 
}: ConvexHullColliderProps) {
  // Auto-generate convex hull vertices if missing and extruded arc is available
  const enhancedShape = React.useMemo(() => {
    if (objectId && currentScene && (!shape.vertices || shape.vertices.length === 0)) {
      const obj = findObjectInScene(currentScene.objects, objectId);
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
    return shape;
  }, [shape, objectId, currentScene]);

  // Validate that we have sufficient vertices for a convex hull (minimum 4 vertices)
  if (!enhancedShape.vertices || enhancedShape.vertices.length < 4) {
    console.warn("ConvexHull collider needs at least 4 vertices, skipping rendering. Current count:", enhancedShape.vertices?.length || 0);
    return <>{children}</>;
  }

  try {
    const vertices = new Float32Array(
      enhancedShape.vertices.flatMap((v) => [v.x, v.y, v.z]),
    );

    return (
      <RapierConvexHullCollider args={[vertices]} {...commonProps}>
        {children}
      </RapierConvexHullCollider>
    );
  } catch (error) {
    console.error("Failed to create ConvexHullCollider:", error);
    return <>{children}</>;
  }
} 