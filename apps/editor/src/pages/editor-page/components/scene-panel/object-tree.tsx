import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  EyeOff, 
  Box, 
  Circle, 
  Cylinder, 
  Square, 
  Copy, 
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { useSceneStore } from "../../stores/scene-store";
import { useEditorConnectionStore } from "../../stores/editor-connection-store";
import { SceneObject } from "../../types";

const getObjectIcon = (type: string) => {
  switch (type) {
    case 'BoxGeometry':
      return Box;
    case 'SphereGeometry':
      return Circle;
    case 'CylinderGeometry':
      return Cylinder;
    case 'PlaneGeometry':
      return Square;
    default:
      return Box;
  }
};

interface ObjectTreeItemProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function ObjectTreeItem({ 
  object, 
  isSelected, 
  onSelect, 
  onToggleVisibility, 
  onDuplicate, 
  onDelete 
}: ObjectTreeItemProps) {
  const ObjectIcon = getObjectIcon(object.type);

  return (
    <div className={`group border rounded-lg p-2 ${isSelected ? 'bg-accent' : 'hover:bg-muted/50'}`}>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="p-1 h-auto"
          onClick={() => onSelect(object.id)}
        >
          <ObjectIcon size={14} />
        </Button>
        
        <div className="flex-1 min-w-0" onClick={() => onSelect(object.id)}>
          <div className="font-medium text-sm truncate">{object.name}</div>
          <div className="text-xs text-muted-foreground">
            {object.type} • {object.position.map(p => p.toFixed(1)).join(', ')}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={() => onToggleVisibility(object.id)}
          >
            {object.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={() => onDuplicate(object.id)}
          >
            <Copy size={12} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto text-destructive hover:text-destructive"
            onClick={() => onDelete(object.id)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {object.children && object.children.length > 0 && (
        <div className="ml-6 mt-2 space-y-1">
          {object.children.map((child) => (
            <ObjectTreeItem
              key={child.id}
              object={child}
              isSelected={isSelected}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ObjectTree() {
  const { 
    sceneObjects, 
    selectedObjectId, 
    setSelectedObjectId, 
    updateObject, 
    duplicateObject, 
    removeObject,
    requestSceneState,
    currentFilePath,
    loadSceneObjects
  } = useSceneStore();
  
  const { isConnected, connectionStatus } = useEditorConnectionStore();

  const handleToggleVisibility = (id: string) => {
    const object = sceneObjects.find(obj => obj.id === id);
    if (object) {
      updateObject(id, { visible: !object.visible });
    }
  };

  const handleRefreshObjects = async () => {
    if (currentFilePath) {
      await loadSceneObjects(currentFilePath);
    }
  };

  const handleRequestSceneState = async () => {
    await requestSceneState();
  };

  const getConnectionIcon = () => {
    return isConnected ? <Wifi size={12} /> : <WifiOff size={12} />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Scene Objects</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {sceneObjects.length}
          </Badge>
          <div className={`flex items-center gap-1 ${getConnectionIcon()}`}>
            {getConnectionIcon()}
            <span className="text-xs">{connectionStatus}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshObjects}
          className="flex-1 text-xs"
        >
          <RefreshCw size={12} className="mr-1" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRequestSceneState}
          disabled={!isConnected}
          className="flex-1 text-xs"
        >
          <Wifi size={12} className="mr-1" />
          Request Live
        </Button>
      </div>

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
      </div>

      {sceneObjects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No objects in scene</p>
          <p className="text-muted-foreground text-xs mt-1">
            {isConnected ? 
              "Try clicking 'Request Live' to get objects from running game" :
              "WebSocket not connected - start dev server and refresh"
            }
          </p>
        </div>
      )}
    </div>
  );
} 