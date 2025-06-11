import React, { useRef, useMemo, useEffect, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import useEditorStore from "@/stores/editor-store";

interface PivotControlsWrapperProps {
  isSelected: boolean;
  objectId: string;
  children: React.ReactNode;
}

const PivotControlsWrapper: React.FC<PivotControlsWrapperProps> = ({
  isSelected,
  objectId,
  children,
}) => {
  const { editorMode, updateObjectTransform, currentScene } = useEditorStore();
  const groupRef = useRef<THREE.Group>(null);
  const transformControlsRef = useRef<any>(null);
  const isManipulatingRef = useRef(false);

  // Get the current object from the store
  const currentObject = useMemo(() => {
    if (!currentScene) return null;
    
    const findObject = (objects: GameObject[]): GameObject | null => {
      for (const obj of objects) {
        if (obj.id === objectId) return obj;
        const found = findObject(obj.children);
        if (found) return found;
      }
      return null;
    };
    
    return findObject(currentScene.objects);
  }, [currentScene, objectId]);

  // Map editor modes to transform control modes
  const transformMode = useMemo(() => {
    switch (editorMode) {
      case "move":
        return "translate";
      case "rotate":
        return "rotate";
      case "scale":
        return "scale";
      default:
        return "translate";
    }
  }, [editorMode]);

  // Show transform controls only when selected and not in select mode
  const shouldShowTransformControls = isSelected && editorMode !== "select";

  const handleDragStart = useCallback(() => {
    isManipulatingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    // Small delay to ensure the final update goes through before clearing the flag
    setTimeout(() => {
      isManipulatingRef.current = false;
    }, 50);
  }, []);

  const handleObjectChange = useCallback(() => {
    if (groupRef.current && isManipulatingRef.current) {
      // Read the current transform directly from the group
      const position = groupRef.current.position;
      const rotation = groupRef.current.rotation;
      const scale = groupRef.current.scale;

      // Update the store with the current transform values
      updateObjectTransform(objectId, {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: scale.x, y: scale.y, z: scale.z },
      });
    }
  }, [objectId, updateObjectTransform]);

  // Apply transform to the group when pivot controls are active
  // Reset transform to identity when pivot controls are inactive
  useEffect(() => {
    if (groupRef.current && currentObject) {
      if (shouldShowTransformControls && !isManipulatingRef.current) {
        // When pivot controls are active, apply the store transform to our group
        const { position, rotation, scale } = currentObject.transform;
        
        groupRef.current.position.set(position.x, position.y, position.z);
        groupRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
        groupRef.current.scale.set(scale.x, scale.y, scale.z);
      } else if (!shouldShowTransformControls) {
        // When pivot controls are inactive, reset our group to identity
        // The outer SceneObject group will handle the transform
        groupRef.current.position.set(0, 0, 0);
        groupRef.current.rotation.set(0, 0, 0);
        groupRef.current.scale.set(1, 1, 1);
      }
    }
  }, [currentObject?.transform, shouldShowTransformControls]);

  return (
    <>
      <group ref={groupRef}>
        {children}
      </group>
      {shouldShowTransformControls && groupRef.current && (
        <TransformControls
          ref={transformControlsRef}
          object={groupRef.current}
          mode={transformMode as "translate" | "rotate" | "scale"}
          size={0.8}
          showX={true}
          showY={true}
          showZ={true}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  );
};

export default PivotControlsWrapper;
