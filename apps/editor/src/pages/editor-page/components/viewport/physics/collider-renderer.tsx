import React from "react";
import useEditorStore from "@/stores/editor-store";
import { generateCommonColliderProps } from "./collider-utils";
import {
  BoxCollider,
  SphereCollider,
  CapsuleCollider,
  CylinderCollider,
  ConvexHullCollider,
  TrimeshCollider,
  HeightfieldCollider,
} from "./collider-shapes";

interface ColliderRendererProps {
  colliderComponent: ColliderComponent;
  children: React.ReactNode;
  transform?: Transform;
  objectId?: string;
}

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
  const commonProps = generateCommonColliderProps(props);

  try {
    switch (shape.type) {
      case "box":
        return (
          <BoxCollider shape={shape} commonProps={commonProps}>
            {children}
          </BoxCollider>
        );

      case "sphere":
        return (
          <SphereCollider shape={shape} commonProps={commonProps}>
            {children}
          </SphereCollider>
        );

      case "capsule":
        return (
          <CapsuleCollider shape={shape} commonProps={commonProps}>
            {children}
          </CapsuleCollider>
        );

      case "cylinder":
        return (
          <CylinderCollider shape={shape} commonProps={commonProps}>
            {children}
          </CylinderCollider>
        );

      case "convexHull":
        return (
          <ConvexHullCollider 
            shape={shape} 
            commonProps={commonProps}
            objectId={objectId}
            currentScene={currentScene || undefined}
          >
            {children}
          </ConvexHullCollider>
        );

      case "trimesh":
        return (
          <TrimeshCollider 
            shape={shape} 
            commonProps={commonProps}
            objectId={objectId}
            currentScene={currentScene || undefined}
          >
            {children}
          </TrimeshCollider>
        );

      case "heightfield":
        return (
          <HeightfieldCollider shape={shape} commonProps={commonProps}>
            {children}
          </HeightfieldCollider>
        );

      default:
        console.warn(`Unsupported collider shape type: ${shape.type}`);
        return <>{children}</>;
    }
  } catch (error) {
    console.warn("Failed to create collider:", error);
    return <>{children}</>;
  }
} 