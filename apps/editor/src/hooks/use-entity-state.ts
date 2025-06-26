import { useEffect, useState, useCallback } from "react";
import { Entity } from "@/models";

/**
 * Custom hook to synchronize React state with Entity class instances.
 * This hook subscribes to entity changes and forces React to re-render
 * when the entity properties change externally.
 */
export function useEntityState(entity: Entity | null) {
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Function to force a re-render
  const triggerUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!entity) return;

    // Subscribe to entity changes
    entity.addChangeListener(triggerUpdate);

    // Cleanup subscription on unmount or entity change
    return () => {
      entity.removeChangeListener(triggerUpdate);
    };
  }, [entity, triggerUpdate]);

  // Return the entity for convenience, but the main purpose is the side effect
  return entity;
}

/**
 * Hook to get specific entity properties with automatic updates.
 * Returns an object with commonly used entity properties that updates
 * when the entity changes.
 */
export function useEntityProperties(entity: Entity | null) {
  useEntityState(entity); // Subscribe to changes

  if (!entity) {
    return null;
  }

  return {
    position: {
      x: entity.position.x,
      y: entity.position.y,
      z: entity.position.z,
    },
    rotation: {
      x: entity.rotation.x,
      y: entity.rotation.y,
      z: entity.rotation.z,
    },
    scale: {
      x: entity.scale.x,
      y: entity.scale.y,
      z: entity.scale.z,
    },
    visible: entity.visible,
    entityName: entity.entityName,
    metadata: entity.metadata,
    physicsType: entity.physicsType,
    physicsMass: entity.physicsMass,
    physicsRestitution: entity.physicsRestitution,
    physicsFriction: entity.physicsFriction,
    // Add script-related properties
    attachedScripts: entity.getAttachedScripts(),
    hasCharacterController: entity.hasCharacterController,
  };
}

/**
 * Hook specifically for tracking entity script state changes.
 * This hook ensures React rerenders when scripts are attached, detached, or modified.
 */
export function useEntityScriptState(entity: Entity | null) {
  const [scriptStateCounter, setScriptStateCounter] = useState(0);
  
  // Function to force a re-render when script state changes
  const triggerScriptUpdate = useCallback(() => {
    setScriptStateCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!entity) return;

    // Subscribe to entity changes (includes script attachment/detachment)
    entity.addChangeListener(triggerScriptUpdate);

    // Cleanup subscription on unmount or entity change
    return () => {
      entity.removeChangeListener(triggerScriptUpdate);
    };
  }, [entity, triggerScriptUpdate]);

  if (!entity) {
    return {
      attachedScripts: [],
      scriptCount: 0,
    };
  }

  const attachedScripts = entity.getAttachedScripts();
  
  return {
    attachedScripts,
    scriptCount: attachedScripts.length,
    // Force dependency on the counter to ensure rerenders
    _scriptStateCounter: scriptStateCounter,
  };
} 