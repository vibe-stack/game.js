import { SceneObjectDefinition } from '../types';
import { SceneDiff, HistoryEntry } from '../stores/scene-history-store';

// Helper to find and update object in nested scene structure
export function findAndUpdateSceneObject(
  sceneRoot: SceneObjectDefinition,
  objectId: string,
  updates: Partial<SceneObjectDefinition>
): { found: boolean; oldValues: Record<string, unknown> } {
  const oldValues: Record<string, unknown> = {};
  
  function traverse(obj: SceneObjectDefinition): boolean {
    if (obj.uuid === objectId) {
      // Capture old values before updating
      Object.keys(updates).forEach(key => {
        oldValues[key] = (obj as unknown as Record<string, unknown>)[key];
      });
      
      // Apply updates
      Object.assign(obj, updates);
      return true;
    }
    
    if (obj.children) {
      for (const child of obj.children) {
        if (traverse(child)) return true;
      }
    }
    
    return false;
  }
  
  return { found: traverse(sceneRoot), oldValues };
}

// Create a diff entry for history tracking
export function createSceneDiff(
  objectId: string,
  property: string,
  oldValue: number[] | string | boolean | object | null,
  newValue: number[] | string | boolean | object | null,
  type: SceneDiff['type'] = 'matrix'
): SceneDiff {
  return {
    type,
    objectId,
    property,
    oldValue,
    newValue,
    timestamp: Date.now()
  };
}

// Create a history entry with description
export function createHistoryEntry(
  description: string,
  diffs: SceneDiff[]
): HistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description,
    diffs,
    timestamp: Date.now()
  };
}

// Apply a diff (for undo operations)
export function applySceneDiff(
  sceneRoot: SceneObjectDefinition,
  diff: SceneDiff,
  reverse: boolean = false
): boolean {
  const value = reverse ? diff.oldValue : diff.newValue;
  const updates = { [diff.property]: value };
  
  const { found } = findAndUpdateSceneObject(sceneRoot, diff.objectId, updates);
  return found;
}

// Generate human-readable description for common operations
export function generateChangeDescription(
  objectName: string,
  property: string,
  oldValue: number[] | string | boolean | object | null,
  newValue: number[] | string | boolean | object | null
): string {
  switch (property) {
    case 'matrix':
      return `Transform ${objectName}`;
    case 'name':
      return `Rename "${oldValue}" to "${newValue}"`;
    case 'visible':
      return `${newValue ? 'Show' : 'Hide'} ${objectName}`;
    default:
      return `Change ${property} of ${objectName}`;
  }
} 