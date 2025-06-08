import React from "react";

interface ObjectInspectorProps {
  scene: GameScene | null;
  selectedObjects: string[];
}

export default function ObjectInspector({ scene, selectedObjects }: ObjectInspectorProps) {
  if (selectedObjects.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an object to edit its properties
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Object Properties
      </h3>
      
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {selectedObjects.length} object(s) selected
        </p>
        
        {selectedObjects.map((objId) => {
          const obj = scene?.objects.find((o) => o.id === objId);
          return obj ? (
            <div key={objId} className="p-2 bg-muted/50 rounded text-xs">
              <div className="font-medium">{obj.name}</div>
              <div className="text-muted-foreground mt-1">ID: {obj.id}</div>
              <div className="text-muted-foreground">
                Components: {obj.components.length}
              </div>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
} 