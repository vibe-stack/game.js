export function generateUniqueId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function duplicateGameObject(obj: GameObject): GameObject {
  const duplicated: GameObject = {
    ...obj,
    id: generateUniqueId(),
    name: `${obj.name} Copy`,
    children: obj.children.map(child => duplicateGameObject(child)),
    components: obj.components.map(component => ({
      ...component,
      id: generateUniqueId(),
    })),
  };
  
  return duplicated;
}

export function filterObjectsBySearch(objects: GameObject[], searchQuery: string): GameObject[] {
  if (!searchQuery.trim()) {
    return objects;
  }
  
  const query = searchQuery.toLowerCase();
  
  const filterRecursive = (obj: GameObject): GameObject | null => {
    const nameMatches = obj.name.toLowerCase().includes(query);
    const filteredChildren = obj.children
      .map(child => filterRecursive(child))
      .filter(Boolean) as GameObject[];
    
    if (nameMatches || filteredChildren.length > 0) {
      return {
        ...obj,
        children: filteredChildren,
      };
    }
    
    return null;
  };
  
  return objects
    .map(obj => filterRecursive(obj))
    .filter(Boolean) as GameObject[];
}

export function flattenObjectHierarchy(objects: GameObject[]): GameObject[] {
  const result: GameObject[] = [];
  
  const flatten = (objs: GameObject[]) => {
    for (const obj of objs) {
      result.push(obj);
      if (obj.children.length > 0) {
        flatten(obj.children);
      }
    }
  };
  
  flatten(objects);
  return result;
}

export function findObjectById(objects: GameObject[], id: string): GameObject | null {
  for (const obj of objects) {
    if (obj.id === id) {
      return obj;
    }
    
    const found = findObjectById(obj.children, id);
    if (found) {
      return found;
    }
  }
  
  return null;
}

export function removeObjectById(objects: GameObject[], id: string): GameObject[] {
  return objects
    .filter(obj => obj.id !== id)
    .map(obj => ({
      ...obj,
      children: removeObjectById(obj.children, id),
    }));
}

export function moveObject(
  objects: GameObject[], 
  sourceId: string, 
  targetId: string | null,
  position: "before" | "after" | "inside" = "inside"
): GameObject[] {
  const sourceObj = findObjectById(objects, sourceId);
  if (!sourceObj) return objects;
  
  const objectsWithoutSource = removeObjectById(objects, sourceId);
  
  if (targetId === null) {
    return [...objectsWithoutSource, sourceObj];
  }
  
  const insertObject = (objs: GameObject[]): GameObject[] => {
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      
      if (obj.id === targetId) {
        if (position === "inside") {
          return objs.map(o =>
            o.id === targetId
              ? { ...o, children: [...o.children, sourceObj] }
              : o
          );
        } else if (position === "before") {
          const newObjs = [...objs];
          newObjs.splice(i, 0, sourceObj);
          return newObjs;
        } else if (position === "after") {
          const newObjs = [...objs];
          newObjs.splice(i + 1, 0, sourceObj);
          return newObjs;
        }
      }
      
      if (obj.children.length > 0) {
        const updatedChildren = insertObject(obj.children);
        if (updatedChildren !== obj.children) {
          return objs.map(o =>
            o.id === obj.id ? { ...o, children: updatedChildren } : o
          );
        }
      }
    }
    
    return objs;
  };
  
  return insertObject(objectsWithoutSource);
} 