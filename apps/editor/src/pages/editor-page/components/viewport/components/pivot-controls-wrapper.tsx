import React, { useRef, useMemo, useEffect, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import useEditorStore from "@/stores/editor-store";
import { useThree } from "@react-three/fiber";
import { useGameWorld } from "@/services/game-world-context";

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
  const { editorMode } = useEditorStore();
  const gameWorld = useGameWorld();
  const groupRef = useRef<THREE.Group>(null);
  const transformControlsRef = useRef<any>(null);
  const isManipulatingRef = useRef(false);
  const { controls } = useThree();
  const lastKnownTransformRef = useRef<Transform | null>(null);
  const controlsRef = useRef<any>(null);

  // Store controls reference
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

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
    
    // Notify GameWorld that this object is being manipulated - IMMEDIATELY
    gameWorld.startManipulating(objectId);
    
    // Disable camera controls during manipulation
    const currentControls = controlsRef.current;
    if (currentControls && 'enabled' in currentControls) {
      currentControls.enabled = false;
    }
    
    // Store the current transform as baseline
    const currentTransform = gameWorld.getObjectTransform(objectId);
    if (currentTransform) {
      lastKnownTransformRef.current = { ...currentTransform };
    }
  }, [gameWorld, objectId]);

  const handleDragEnd = useCallback(() => {
    // Re-enable camera controls
    const currentControls = controlsRef.current;
    if (currentControls && 'enabled' in currentControls) {
      currentControls.enabled = true;
    }
    
    // Clear state immediately - no delay needed
    isManipulatingRef.current = false;
    lastKnownTransformRef.current = null;
    
    // Notify GameWorld that manipulation is complete - IMMEDIATELY
    gameWorld.stopManipulating(objectId);
  }, [gameWorld, objectId]);

  const handleObjectChange = useCallback(() => {
    if (!groupRef.current || !isManipulatingRef.current) return;

    // Read the current transform directly from the group
    const position = groupRef.current.position;
    const rotation = groupRef.current.rotation;
    const scale = groupRef.current.scale;

    // Create the new transform
    const newTransform: Transform = {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      scale: { x: scale.x, y: scale.y, z: scale.z },
    };

    // Update GameWorld directly - this will trigger the proper event chain
    gameWorld.updateObjectTransform(objectId, newTransform);
  }, [gameWorld, objectId]);

  // Sync initial transform when pivot controls become active
  useEffect(() => {
    if (!groupRef.current) return;

    if (shouldShowTransformControls && !isManipulatingRef.current) {
      // Get the latest transform from GameWorld
      const currentTransform = gameWorld.getObjectTransform(objectId);
      if (currentTransform) {
        const { position, rotation, scale } = currentTransform;
        
        // Apply transform to our group
        groupRef.current.position.set(position.x, position.y, position.z);
        groupRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
        groupRef.current.scale.set(scale.x, scale.y, scale.z);
      }
    } else if (!shouldShowTransformControls) {
      // When pivot controls are inactive, reset our group to identity
      // The outer SceneObject group will handle the transform
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.scale.set(1, 1, 1);
    }
  }, [shouldShowTransformControls, gameWorld, objectId]);

  // Listen to GameWorld transform updates and sync when not manipulating
  useEffect(() => {
    if (!gameWorld) return;

    const handleTransformUpdate = ({ objectId: updatedId, transform }: { objectId: string; transform: Transform }) => {
      // Only sync if this is our object and we're not currently manipulating
      if (updatedId === objectId && !isManipulatingRef.current && groupRef.current && shouldShowTransformControls) {
        const { position, rotation, scale } = transform;
        groupRef.current.position.set(position.x, position.y, position.z);
        groupRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
        groupRef.current.scale.set(scale.x, scale.y, scale.z);
      }
    };

    gameWorld.on("objectTransformUpdate", handleTransformUpdate);

    return () => {
      gameWorld.off("objectTransformUpdate", handleTransformUpdate);
    };
  }, [gameWorld, objectId, shouldShowTransformControls]);

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
