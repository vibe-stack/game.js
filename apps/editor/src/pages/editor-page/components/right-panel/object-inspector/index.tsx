import React from "react";
import useEditorStore from "@/stores/editor-store";
import TransformControls from "./transform-controls";
import ComponentsList from "./components-list";
import ObjectHeader from "./object-header";
import CollapsibleSection from "./collapsible-section";

interface ObjectInspectorProps {
  scene: GameScene | null;
  selectedObjects: string[];
}

export default function ObjectInspector({ scene, selectedObjects }: ObjectInspectorProps) {
  const { 
    selectedObjectData, 
    gameWorld,
    physicsState,
    updateObject, 
    updateObjectTransform, 
    updateObjectComponent, 
    addObjectComponent 
  } = useEditorStore();

  if (selectedObjects.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an object to edit its properties
      </div>
    );
  }

  const handleObjectUpdate = (objectId: string, updates: Partial<GameObject>) => {
    // During editing mode, use the store methods to ensure UI reactivity
    // During physics simulation, we can directly update GameWorld
    if (physicsState === 'playing' && gameWorld) {
      Object.keys(updates).forEach(key => {
        gameWorld.updateObjectProperty(objectId, key, (updates as any)[key]);
      });
    } else {
      // Use store method which updates both GameWorld and store state
      updateObject(objectId, updates);
    }
  };

  const handleTransformUpdate = (objectId: string, transform: Partial<Transform>) => {
    // During editing mode, use the store methods to ensure UI reactivity
    // During physics simulation, we can directly update GameWorld
    if (physicsState === 'playing' && gameWorld) {
      gameWorld.updateObjectTransform(objectId, transform);
    } else {
      // Use store method which updates both GameWorld and store state
      updateObjectTransform(objectId, transform);
    }
  };

  const handleComponentUpdate = (objectId: string, componentId: string, updates: Partial<GameObjectComponent | PhysicsComponent>) => {
    // During editing mode, use the store methods to ensure UI reactivity
    // During physics simulation, we can directly update GameWorld
    if (physicsState === 'playing' && gameWorld) {
      gameWorld.updateObjectComponent(objectId, componentId, updates);
    } else {
      // Use store method which updates both GameWorld and store state
      updateObjectComponent(objectId, componentId, updates);
    }
  };

  const handleAddComponent = (objectId: string, component: GameObjectComponent | PhysicsComponent) => {
    addObjectComponent(objectId, component);
  };

  if (selectedObjects.length === 1) {
    // Use the snapshot from the store for single selection
    const obj = selectedObjectData;
    if (!obj) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          Object not found
        </div>
      );
    }

    return (
      <div className="max-h-[calc(90vh-10rem)] overflow-y-auto">
        <div className="p-4 border-b border-border/30">
          <ObjectHeader 
            object={obj} 
            onUpdate={(updates) => handleObjectUpdate(obj.id, updates)}
          />
        </div>
        
        <CollapsibleSection 
          title="Transform" 
          storageKey="transform"
          defaultOpen={true}
        >
          <TransformControls 
            transform={obj.transform}
            onUpdate={(transform) => handleTransformUpdate(obj.id, transform)}
          />
        </CollapsibleSection>
        
        <CollapsibleSection 
          title="Components" 
          storageKey="components"
          defaultOpen={true}
        >
          <ComponentsList 
            components={obj.components}
            objectId={obj.id}
            onUpdate={(componentId, updates) => handleComponentUpdate(obj.id, componentId, updates)}
            onAddComponent={(component) => handleAddComponent(obj.id, component)}
          />
        </CollapsibleSection>
      </div>
    );
  }

  // Multi-selection handling - get objects from GameWorld if available
  const getSelectedObject = (objectId: string): GameObject | null => {
    if (gameWorld) {
      return gameWorld.getObject(objectId);
    }
    
    // Fallback to scene search if GameWorld not available
    if (!scene) return null;
    
    const findObject = (objects: GameObject[]): GameObject | null => {
      for (const obj of objects) {
        if (obj.id === objectId) return obj;
        const found = findObject(obj.children);
        if (found) return found;
      }
      return null;
    };
    
    return findObject(scene.objects);
  };

  // Multi-selection handling
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        {selectedObjects.length} objects selected
      </div>
      
      <div className="space-y-2">
        {selectedObjects.map((objId) => {
          const obj = getSelectedObject(objId);
          return obj ? (
            <div key={objId} className="p-2 bg-muted/50 rounded text-xs">
              <div className="font-medium">{obj.name}</div>
              <div className="text-muted-foreground">ID: {obj.id}</div>
            </div>
          ) : null;
        })}
      </div>
      
      <div className="text-xs text-muted-foreground mt-4">
        Multi-selection editing coming soon
      </div>
    </div>
  );
} 