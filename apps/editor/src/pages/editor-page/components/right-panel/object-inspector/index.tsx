import React from "react";
import useEditorStore from "@/stores/editor-store";
import TransformControls from "./transform-controls";
import ComponentsList from "./components-list";
import ObjectHeader from "./object-header";

interface ObjectInspectorProps {
  scene: GameScene | null;
  selectedObjects: string[];
}

export default function ObjectInspector({ scene, selectedObjects }: ObjectInspectorProps) {
  const { updateObject, updateObjectTransform, updateObjectComponent, addObjectComponent } = useEditorStore();

  if (selectedObjects.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an object to edit its properties
      </div>
    );
  }

  const getSelectedObject = (objectId: string): GameObject | null => {
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

  const handleObjectUpdate = (objectId: string, updates: Partial<GameObject>) => {
    updateObject(objectId, updates);
  };

  const handleTransformUpdate = (objectId: string, transform: Partial<Transform>) => {
    updateObjectTransform(objectId, transform);
  };

  const handleComponentUpdate = (objectId: string, componentId: string, updates: Partial<GameObjectComponent | PhysicsComponent>) => {
    updateObjectComponent(objectId, componentId, updates);
  };

  const handleAddComponent = (objectId: string, component: GameObjectComponent | PhysicsComponent) => {
    addObjectComponent(objectId, component);
  };

  if (selectedObjects.length === 1) {
    const obj = getSelectedObject(selectedObjects[0]);
    if (!obj) return null;

    return (
      <div className="p-4 space-y-6 max-h-[calc(90vh-10rem)] overflow-y-auto">
        <ObjectHeader 
          object={obj} 
          onUpdate={(updates) => handleObjectUpdate(obj.id, updates)}
        />
        
        <TransformControls 
          transform={obj.transform}
          onUpdate={(transform) => handleTransformUpdate(obj.id, transform)}
        />
        
        <ComponentsList 
          components={obj.components}
          onUpdate={(componentId, updates) => handleComponentUpdate(obj.id, componentId, updates)}
          onAddComponent={(component) => handleAddComponent(obj.id, component)}
        />
      </div>
    );
  }

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
    </div>
  );
} 