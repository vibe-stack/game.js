import React from "react";
import { GameWorldService } from "../../../services/game-world-service";
import useGameStudioStore from "@/stores/game-studio-store";
import { useEntityProperties } from "@/hooks/use-entity-state";
import { Entity } from "@/models";
import { EntityInfo } from "./entity-info";
import { TransformSection } from "./transform-section";
import { TagsSection } from "./tags-section";
import { EntityPropertiesRegistry } from "./entity-properties-registry";

interface InspectorProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function Inspector({ gameWorldService }: InspectorProps) {
  const { selectedEntity: selectedEntityId } = useGameStudioStore();
  
  // Get the selected entity
  const selectedEntity = React.useMemo(() => {
    if (!selectedEntityId || !gameWorldService.current) return null;
    
    const gameWorld = gameWorldService.current.getGameWorld();
    if (!gameWorld) return null;
    
    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return null;
    
    return entitiesRegistry.get(selectedEntityId) || null;
  }, [selectedEntityId, gameWorldService]);

  // Use the hook to subscribe to entity changes
  const properties = useEntityProperties(selectedEntity);

  // Note: Entity name is currently read-only in the Entity class

  const handleVisibilityChange = (visible: boolean) => {
    if (!selectedEntity) return;
    selectedEntity.setVisible(visible);
  };

  const handlePositionChange = (position: { x: number; y: number; z: number }) => {
    if (!selectedEntity) return;
    selectedEntity.setPosition(position.x, position.y, position.z);
  };

  const handleRotationChange = (rotation: { x: number; y: number; z: number }) => {
    if (!selectedEntity) return;
    selectedEntity.setRotation(rotation.x, rotation.y, rotation.z);
  };

  const handleScaleChange = (scale: { x: number; y: number; z: number }) => {
    if (!selectedEntity) return;
    selectedEntity.setScale(scale.x, scale.y, scale.z);
  };

  const handleTagsChange = (tags: string[]) => {
    if (!selectedEntity) return;
    // Clear existing tags and add new ones
    selectedEntity.metadata.tags = [];
    tags.forEach(tag => selectedEntity.addTag(tag));
  };

  const handleEntityUpdate = () => {
    // Force a re-render to reflect changes
    // This could be optimized with more specific state updates
  };

  if (!selectedEntity || !properties) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
        <p>No entity selected</p>
        <p className="text-sm">Select an entity in the scene to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      <EntityInfo
        entityName={properties.entityName}
        entityType={properties.metadata.type}
        visible={properties.visible}
        onNameChange={() => {}} // Read-only for now
        onVisibilityChange={handleVisibilityChange}
      />

      <TransformSection
        position={properties.position}
        rotation={properties.rotation}
        scale={properties.scale}
        onPositionChange={handlePositionChange}
        onRotationChange={handleRotationChange}
        onScaleChange={handleScaleChange}
      />

      <EntityPropertiesRegistry
        entity={selectedEntity}
      />

      <TagsSection
        tags={properties.metadata.tags}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
} 