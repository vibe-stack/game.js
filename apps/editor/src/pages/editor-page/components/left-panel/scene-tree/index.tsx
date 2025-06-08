import React from "react";

interface SceneTreeProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (objectId: string) => void;
}

export default function SceneTree({ scene, selectedObjects, onSelectObject }: SceneTreeProps) {
  if (!scene) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No scene loaded
      </div>
    );
  }

  return (
    <div className="p-4 space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Scene Objects</h3>
      {scene.objects.map((obj) => (
        <div
          key={obj.id}
          className={`cursor-pointer rounded px-3 py-2 text-sm transition-colors ${
            selectedObjects.includes(obj.id)
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
          onClick={() => onSelectObject(obj.id)}
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {obj.visible ? "👁" : "🚫"}
            </span>
            <span>{obj.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
} 