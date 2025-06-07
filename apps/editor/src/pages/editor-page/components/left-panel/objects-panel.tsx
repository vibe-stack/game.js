import React from "react";
import { Button } from "../../../../components/ui/button";
import {
  Eye,
  EyeOff,
  Box,
  Circle,
  Cylinder,
  Square,
  Copy,
  Trash2,
} from "lucide-react";
import { useSceneObjectsStore, useSceneRoutesStore, useSceneSyncStore } from "../../stores/scene-store";
import { SceneObject } from "../../types";
import { cn } from "../../../../utils/tailwind";

const getObjectIcon = (type: string) => {
  // Simplified from original to prevent crashing on unknown types
  switch (type) {
    case "BoxGeometry":
      return Box;
    case "SphereGeometry":
      return Circle;
    case "CylinderGeometry":
      return Cylinder;
    case "PlaneGeometry":
      return Square;
    default:
      return Box; // Default icon
  }
};

interface ObjectTreeItemProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  level?: number;
}

function ObjectTreeItem({
  object,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  level = 0
}: ObjectTreeItemProps) {
  const ObjectIcon = getObjectIcon(object.type);

  // Basic recursive rendering for children
  const hasChildren = object.children && object.children.length > 0;

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 w-full text-left p-2 rounded-lg transition-all cursor-pointer",
          isSelected 
            ? "bg-emerald-500/15 text-emerald-200" 
            : "hover:bg-gray-800/50 text-gray-300"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(object.id)}
      >
        <ObjectIcon size={16} className="flex-shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-xs">{object.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-700/50"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(object.id);
            }}
          >
            {object.visible ? (
              <Eye size={12} className="text-gray-400" />
            ) : (
              <EyeOff size={12} className="text-gray-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-700/50"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(object.id);
            }}
          >
            <Copy size={12} className="text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-900/50 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(object.id);
            }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
      {hasChildren && (
        <div>
          {object.children!.map((child) => (
            <ObjectTreeItem
              key={child.id}
              object={child}
              isSelected={isSelected}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function ObjectsPanel() {
  const {
    sceneObjects,
    selectedObjectId,
    setSelectedObjectId,
    updateObject,
    duplicateObject,
    removeObject,
  } = useSceneObjectsStore();
  
  const { currentFilePath } = useSceneRoutesStore();
  const { loadSceneObjects } = useSceneSyncStore();

  React.useEffect(() => {
    if (currentFilePath) {
      loadSceneObjects(currentFilePath);
    }
  }, [currentFilePath, loadSceneObjects]);

  const findObjectById = (objects: SceneObject[], id: string): SceneObject | null => {
    for (const obj of objects) {
      if (obj.id === id) return obj;
      if (obj.children) {
        const found = findObjectById(obj.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const handleToggleVisibility = async (id: string) => {
    const object = findObjectById(sceneObjects, id);
    if (object) {
      await updateObject(id, { visible: !object.visible });
    }
  };

  return (
    <div className="space-y-1">
      {sceneObjects.map((object) => (
        <ObjectTreeItem
          key={object.id}
          object={object}
          isSelected={selectedObjectId === object.id}
          onSelect={setSelectedObjectId}
          onToggleVisibility={handleToggleVisibility}
          onDuplicate={duplicateObject}
          onDelete={removeObject}
        />
      ))}
      {sceneObjects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No objects in scene</p>
          <p className="text-gray-600 text-xs mt-1">Add objects to see them here</p>
        </div>
      )}
    </div>
  );
} 