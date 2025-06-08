import React, { useEffect, useState } from 'react';
import { useSceneObjectsStore } from '../../stores/scene-objects-store';
import { SceneObject } from '../../types';
import { ObjectInfoSection } from './sections/object-info-section';
import { PositionSection } from './sections/position-section';
import { RotationSection } from './sections/rotation-section';
import { ScaleSection } from './sections/scale-section';
import { HistorySection } from './sections/history-section';
import {
  extractPositionFromMatrix,
  extractRotationFromMatrix,
  extractScaleFromMatrix,
  updateMatrixPosition,
  updateMatrixRotation,
  updateMatrixScale,
} from '../../utils/matrix-transforms';

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

  // Extract transform values from matrix
  const getPosition = (): [number, number, number] => {
    if (!selectedObject?.matrix || selectedObject.matrix.length !== 16) {
      return [0, 0, 0];
    }
    return extractPositionFromMatrix(selectedObject.matrix);
  };

  const getRotation = (): [number, number, number] => {
    if (!selectedObject?.matrix || selectedObject.matrix.length !== 16) {
      return [0, 0, 0];
    }
    return extractRotationFromMatrix(selectedObject.matrix);
  };

  const getScale = (): [number, number, number] => {
    if (!selectedObject?.matrix || selectedObject.matrix.length !== 16) {
      return [1, 1, 1];
    }
    return extractScaleFromMatrix(selectedObject.matrix);
  };

  const handleNameChange = (value: string) => {
    if (selectedObject) {
      updateObject(selectedObject.id, { name: value });
    }
  };

  const handleIdChange = (value: string) => {
    if (selectedObject) {
      updateObject(selectedObject.id, { id: value });
    }
  };

  const handlePositionChange = (position: [number, number, number]) => {
    if (selectedObject?.matrix) {
      const newMatrix = updateMatrixPosition(selectedObject.matrix, position);
      updateObject(selectedObject.id, { matrix: newMatrix });
    }
  };

  const handleRotationChange = (rotation: [number, number, number]) => {
    if (selectedObject?.matrix) {
      const newMatrix = updateMatrixRotation(selectedObject.matrix, rotation);
      updateObject(selectedObject.id, { matrix: newMatrix });
    }
  };

  const handleScaleChange = (scale: [number, number, number]) => {
    if (selectedObject?.matrix) {
      const newMatrix = updateMatrixScale(selectedObject.matrix, scale);
      updateObject(selectedObject.id, { matrix: newMatrix });
    }
  };

  return (
    <div className="space-y-4">
      {/* History Section - Always visible */}
      <HistorySection />

      {/* Object-specific sections - Only when object is selected */}
      {selectedObject ? (
        <>
          <ObjectInfoSection
            object={selectedObject}
            onNameChange={handleNameChange}
            onIdChange={handleIdChange}
          />

          {/* Transform */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wide">Transform</h3>
            
            <PositionSection
              position={getPosition()}
              onChange={handlePositionChange}
            />
            
            <RotationSection
              rotation={getRotation()}
              onChange={handleRotationChange}
            />
            
            <ScaleSection
              scale={getScale()}
              onChange={handleScaleChange}
            />
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 text-sm mt-8">
          Select an object to inspect its properties
        </div>
      )}
    </div>
  );
} 