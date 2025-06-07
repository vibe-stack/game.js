import React, { useEffect, useState } from 'react';
import { DragInput } from '@/components/ui/drag-input';
import { Input } from '@/components/ui/input';
import { useSceneObjectsStore } from '../../stores/scene-store';
import { SceneObject } from '../../types';

export function InspectPanel() {
  const { sceneObjects, selectedObjectId, updateObject } = useSceneObjectsStore();
  const [selectedObject, setSelectedObject] = useState<SceneObject | null>(null);

  // Find the selected object and update local state
  useEffect(() => {
    if (selectedObjectId) {
      const findObjectById = (objects: SceneObject[], id: string): SceneObject | null => {
        for (const obj of objects) {
          if (obj.id === id) return obj;
          if (obj.children) {
            const found = findObjectById(obj.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const found = findObjectById(sceneObjects, selectedObjectId);
      setSelectedObject(found);
    } else {
      setSelectedObject(null);
    }
  }, [selectedObjectId, sceneObjects]);

  if (!selectedObject) {
    return (
      <div className="text-center text-gray-500 text-sm mt-8">
        Select an object to inspect its properties
      </div>
    );
  }

  const handleNameChange = (value: string) => {
    updateObject(selectedObject.id, { name: value });
  };

  const handleIdChange = (value: string) => {
    updateObject(selectedObject.id, { id: value });
  };

  const handlePositionChange = (axis: 0 | 1 | 2, value: number) => {
    const newPosition = [...selectedObject.position] as [number, number, number];
    newPosition[axis] = value;
    updateObject(selectedObject.id, { position: newPosition });
  };

  const handleRotationChange = (axis: 0 | 1 | 2, value: number) => {
    const newRotation = [...selectedObject.rotation] as [number, number, number];
    newRotation[axis] = value;
    updateObject(selectedObject.id, { rotation: newRotation });
  };

  const handleScaleChange = (axis: 0 | 1 | 2, value: number) => {
    const newScale = [...selectedObject.scale] as [number, number, number];
    newScale[axis] = value;
    updateObject(selectedObject.id, { scale: newScale });
  };

  return (
    <div className="space-y-4">
      {/* Object Identity */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Object</h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Name</label>
            <Input
              value={selectedObject.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-8 text-xs bg-gray-800/30 border-gray-700/50 text-gray-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">ID</label>
            <Input
              value={selectedObject.id}
              onChange={(e) => handleIdChange(e.target.value)}
              className="h-8 text-xs bg-gray-800/30 border-gray-700/50 text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Transform */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Transform</h3>
        
        {/* Position */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Position</label>
          <div className="grid grid-cols-3 gap-2">
            <DragInput
              label="X"
              value={selectedObject.position[0]}
              onChange={(value) => handlePositionChange(0, value)}
              step={0.1}
              precision={2}
              className="text-xs"
            />
            <DragInput
              label="Y"
              value={selectedObject.position[1]}
              onChange={(value) => handlePositionChange(1, value)}
              step={0.1}
              precision={2}
              className="text-xs"
            />
            <DragInput
              label="Z"
              value={selectedObject.position[2]}
              onChange={(value) => handlePositionChange(2, value)}
              step={0.1}
              precision={2}
              className="text-xs"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Rotation</label>
          <div className="grid grid-cols-3 gap-2">
            <DragInput
              label="X"
              value={selectedObject.rotation[0]}
              onChange={(value) => handleRotationChange(0, value)}
              step={0.1}
              precision={2}
              className="text-xs"
            />
            <DragInput
              label="Y"
              value={selectedObject.rotation[1]}
              onChange={(value) => handleRotationChange(1, value)}
              step={0.1}
              precision={2}
              className="text-xs"
            />
            <DragInput
              label="Z"
              value={selectedObject.rotation[2]}
              onChange={(value) => handleRotationChange(2, value)}
              step={0.1}
              precision={2}
              className="text-xs"
            />
          </div>
        </div>

        {/* Scale */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Scale</label>
          <div className="grid grid-cols-3 gap-2">
            <DragInput
              label="X"
              value={selectedObject.scale[0]}
              onChange={(value) => handleScaleChange(0, value)}
              step={0.1}
              precision={2}
              min={0.01}
              className="text-xs"
            />
            <DragInput
              label="Y"
              value={selectedObject.scale[1]}
              onChange={(value) => handleScaleChange(1, value)}
              step={0.1}
              precision={2}
              min={0.01}
              className="text-xs"
            />
            <DragInput
              label="Z"
              value={selectedObject.scale[2]}
              onChange={(value) => handleScaleChange(2, value)}
              step={0.1}
              precision={2}
              min={0.01}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Object Info */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Info</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Type: <span className="text-gray-300">{selectedObject.type}</span></div>
          <div>Visible: <span className="text-gray-300">{selectedObject.visible ? 'Yes' : 'No'}</span></div>
          {selectedObject.children && (
            <div>Children: <span className="text-gray-300">{selectedObject.children.length}</span></div>
          )}
        </div>
      </div>
    </div>
  );
} 