export interface FlattenedItem {
  id: string;
  children: FlattenedItem[];
  collapsed?: boolean;
  depth: number;
  index: number;
  parentId: string | null;
  object: GameObject;
}

export function flattenTree(items: GameObject[], parentId: string | null = null, depth = 0): FlattenedItem[] {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    const flattenedItem: FlattenedItem = {
      id: item.id,
      children: [],
      depth,
      index,
      parentId,
      object: item,
    };

    acc.push(flattenedItem);

    if (item.children && item.children.length > 0) {
      acc.push(...flattenTree(item.children, item.id, depth + 1));
    }

    return acc;
  }, []);
}

export function buildTree(flattenedItems: FlattenedItem[]): GameObject[] {
  const root: GameObject[] = [];
  const lookup: { [key: string]: GameObject } = {};

  // Create lookup table
  flattenedItems.forEach((item) => {
    lookup[item.id] = { ...item.object, children: [] };
  });

  // Build tree structure
  flattenedItems.forEach((item) => {
    const obj = lookup[item.id];
    
    if (item.parentId === null) {
      root.push(obj);
    } else {
      const parent = lookup[item.parentId];
      if (parent) {
        parent.children.push(obj);
      }
    }
  });

  return root;
}

export function removeChildrenOf(items: FlattenedItem[], ids: string[]): FlattenedItem[] {
  const excludeIds = new Set(ids);
  
  return items.filter((item) => {
    let currentParent = item.parentId;
    
    while (currentParent) {
      if (excludeIds.has(currentParent)) {
        return false;
      }
      
      const parentItem = items.find(i => i.id === currentParent);
      currentParent = parentItem?.parentId || null;
    }
    
    return true;
  });
}

export function getProjection(
  items: FlattenedItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number
) {
  const overItemIndex = items.findIndex(({ id }) => id === overId);
  const activeItemIndex = items.findIndex(({ id }) => id === activeId);
  const activeItem = items[activeItemIndex];
  const newItems = [...items];
  const overItem = items[overItemIndex];
  
  if (!activeItem || !overItem) {
    return null;
  }

  const dragDepth = Math.round(dragOffset / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = getMaxDepth({ previousItem: overItem });
  const minDepth = getMinDepth({ nextItem: overItem });
  let depth = projectedDepth;

  if (projectedDepth >= maxDepth) {
    depth = maxDepth;
  } else if (projectedDepth < minDepth) {
    depth = minDepth;
  }

  function getParentId(): string | null {
    if (depth === 0 || !overItem) {
      return null;
    }

    if (depth === overItem.depth) {
      return overItem.parentId;
    }

    if (depth > overItem.depth) {
      return overItem.id;
    }

    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId;

    return newParent ?? null;
  }

  return {
    depth,
    maxDepth,
    minDepth,
    parentId: getParentId(),
  };
}

function getMaxDepth({ previousItem }: { previousItem: FlattenedItem }) {
  return previousItem ? previousItem.depth + 1 : 0;
}

function getMinDepth({ nextItem }: { nextItem: FlattenedItem }) {
  if (nextItem) {
    return nextItem.depth;
  }

  return 0;
}

export function removeItem(items: GameObject[], id: string): GameObject[] {
  const newItems = [];

  for (const item of items) {
    if (item.id === id) {
      continue;
    }

    if (item.children.length) {
      newItems.push({
        ...item,
        children: removeItem(item.children, id),
      });
    } else {
      newItems.push(item);
    }
  }

  return newItems;
}

export function setProperty<T extends keyof GameObject>(
  items: GameObject[],
  id: string,
  property: T,
  setter: (value: GameObject[T]) => GameObject[T]
): GameObject[] {
  return items.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        [property]: setter(item[property]),
      };
    }

    if (item.children.length) {
      return {
        ...item,
        children: setProperty(item.children, id, property, setter),
      };
    }

    return item;
  });
} 