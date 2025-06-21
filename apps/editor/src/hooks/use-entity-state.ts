import { useEffect, useState, useCallback } from "react";
import { Entity } from "@/models";

/**
 * Custom hook to synchronize React state with Entity class instances.
 * This hook subscribes to entity changes and forces React to re-render
 * when the entity properties change externally.
 */
export function useEntityState(entity: Entity | null) {
  const [, forceUpdate] = useState({});
  
  // Function to force a re-render
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
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
  };
} 