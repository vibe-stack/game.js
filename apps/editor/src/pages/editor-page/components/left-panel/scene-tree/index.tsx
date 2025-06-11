import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  MeasuringStrategy,
  defaultDropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import useEditorStore from "@/stores/editor-store";
import { gameObjectTemplates } from "./templates";
import CreateObjectMenu from "./components/create-object-menu";
import SceneTreeNode from "./components/scene-tree-node";
import SceneTreeSearch from "./components/scene-tree-search";
import {
  duplicateGameObject,
  filterObjectsBySearch,
} from "./utils/object-utils";
import {
  flattenTree,
  buildTree,
  removeChildrenOf,
  getProjection,
  removeItem,
  setProperty,
  FlattenedItem,
} from "./utils/tree-utils";

interface SceneTreeProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (objectId: string, event?: React.MouseEvent) => void;
}

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

const indentationWidth = 20;

export default function SceneTree({
  scene,
  selectedObjects,
  onSelectObject,
}: SceneTreeProps) {
  const { addObject, removeObject, setCurrentScene, deselectAll } =
    useEditorStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [clipboard, setClipboard] = useState<GameObject | null>(null);
  const [clipboardAction, setClipboardAction] = useState<"copy" | "cut" | null>(
    null,
  );
  const [lockedObjects, setLockedObjects] = useState<Set<string>>(new Set());

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300,
        distance: 15,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const filteredObjects = useMemo(() => {
    if (!scene) return [];
    return filterObjectsBySearch(scene.objects, searchQuery);
  }, [scene?.objects, searchQuery]);

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(filteredObjects);
    const collapsedIds = Array.from(collapsedItems);

    return removeChildrenOf(
      flattenedTree,
      activeId != null ? [activeId, ...collapsedIds] : collapsedIds,
    );
  }, [filteredObjects, activeId, collapsedItems]);

  const projected =
    activeId && overId
      ? getProjection(
          flattenedItems,
          activeId,
          overId,
          offsetLeft,
          indentationWidth,
        )
      : null;

  const sortedIds = useMemo(
    () => flattenedItems.map(({ id }) => id),
    [flattenedItems],
  );

  const activeItem = activeId
    ? flattenedItems.find(({ id }) => id === activeId)
    : null;

  const handleAddObject = useCallback(
    (template: (typeof gameObjectTemplates)[0]) => {
      const newObject: GameObject = {
        id: `${template.id}-${Date.now()}`,
        name: template.name,
        children: [],
        ...template.template,
      };

      addObject(newObject);
    },
    [addObject],
  );

  const handleDuplicate = useCallback(
    (object: GameObject) => {
      const duplicated = duplicateGameObject(object);
      addObject(duplicated);
    },
    [addObject],
  );

  const handleCopy = useCallback((object: GameObject) => {
    setClipboard(object);
    setClipboardAction("copy");
  }, []);

  const handleCut = useCallback((object: GameObject) => {
    setClipboard(object);
    setClipboardAction("cut");
  }, []);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    if (clipboardAction === "copy") {
      const duplicated = duplicateGameObject(clipboard);
      addObject(duplicated);
    } else if (clipboardAction === "cut") {
      removeObject(clipboard.id);
      addObject(clipboard);
      setClipboard(null);
      setClipboardAction(null);
    }
  }, [clipboard, clipboardAction, addObject, removeObject]);

  const handleDelete = useCallback(
    (objectId: string) => {
      if (!scene) return;
      const newObjects = removeItem(scene.objects, objectId);
      setCurrentScene({ ...scene, objects: newObjects });
    },
    [scene, setCurrentScene],
  );

  const handleToggleLock = useCallback((objectId: string) => {
    setLockedObjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  }, []);

  const handleFocusCamera = useCallback((objectId: string) => {
    console.log("Focus camera on object:", objectId);
  }, []);

  const handleToggleVisibility = useCallback(
    (objectId: string) => {
      if (!scene) return;
      const newObjects = setProperty(
        scene.objects,
        objectId,
        "visible",
        (visible) => !visible,
      );
      setCurrentScene({ ...scene, objects: newObjects });
    },
    [scene, setCurrentScene],
  );

  const handleCollapse = useCallback((id: string) => {
    setCollapsedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleDragStart = useCallback(
    ({ active: { id: activeId } }: DragStartEvent) => {
      setActiveId(activeId as string);
      setOverId(activeId as string);

      document.body.style.setProperty("cursor", "grabbing");
    },
    [],
  );

  const handleDragMove = useCallback(({ delta }: DragMoveEvent) => {
    setOffsetLeft(delta.x);
  }, []);

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    setOverId((over?.id as string) ?? null);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      resetState();

      if (projected && over && scene) {
        const { depth, parentId } = projected;
        const clonedItems: FlattenedItem[] = JSON.parse(
          JSON.stringify(flattenTree(scene.objects)),
        );
        const overIndex = clonedItems.findIndex(({ id }) => id === over.id);
        const activeIndex = clonedItems.findIndex(({ id }) => id === active.id);
        const activeTreeItem = clonedItems[activeIndex];

        clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId };

        const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
        const newItems = buildTree(sortedItems);

        setCurrentScene({ ...scene, objects: newItems });
      }
    },
    [projected, scene, setCurrentScene],
  );

  const handleDragCancel = useCallback(() => {
    resetState();
  }, []);

  const resetState = useCallback(() => {
    setOverId(null);
    setActiveId(null);
    setOffsetLeft(0);
    document.body.style.setProperty("cursor", "");
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!selectedObjects.length) return;

      const activeElement = document.activeElement;
      const isTreeFocused = activeElement?.closest("[data-scene-tree]");

      if (!isTreeFocused) return;

      // Don't handle delete/backspace if user is typing in an input field
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable === true)
      ) {
        return;
      }

      switch (event.key) {
        case "Delete":
        case "Backspace":
          selectedObjects.forEach((id) => handleDelete(id));
          break;
        case "c":
          if (event.ctrlKey || event.metaKey) {
            const firstObject = flattenedItems.find((item) =>
              selectedObjects.includes(item.id),
            );
            if (firstObject) handleCopy(firstObject.object);
          }
          break;
        case "x":
          if (event.ctrlKey || event.metaKey) {
            const firstObject = flattenedItems.find((item) =>
              selectedObjects.includes(item.id),
            );
            if (firstObject) handleCut(firstObject.object);
          }
          break;
        case "v":
          if (event.ctrlKey || event.metaKey) {
            handlePaste();
          }
          break;
        case "d":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const firstObject = flattenedItems.find((item) =>
              selectedObjects.includes(item.id),
            );
            if (firstObject) handleDuplicate(firstObject.object);
          }
          break;
      }
    },
    [
      selectedObjects,
      flattenedItems,
      handleDelete,
      handleCopy,
      handleCut,
      handlePaste,
      handleDuplicate,
    ],
  );

  const handleEmptySpaceClick = useCallback(
    (e: React.MouseEvent) => {
      // Only clear selection if clicking directly on the container, not on child elements
      if (e.target === e.currentTarget) {
        deselectAll();
      }
    },
    [deselectAll],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!scene) {
    return (
      <div className="text-muted-foreground p-4 text-center">
        No scene loaded
      </div>
    );
  }

  return (
    <div
      className="space-y-1 p-4"
      data-scene-tree
      tabIndex={0}
      onClick={handleEmptySpaceClick}
    >
      <div className="sticky top-1 flex gap-2 bg-black/30 rounded-lg backdrop-blur-md z-20">
        <SceneTreeSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <CreateObjectMenu onAddObject={handleAddObject} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={sortedIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 select-none">
            {flattenedItems.map(({ id, object, depth }) => (
              <SceneTreeNode
                key={id}
                id={id}
                object={object}
                depth={depth}
                selectedObjects={selectedObjects}
                onSelectObject={onSelectObject}
                onToggleVisibility={handleToggleVisibility}
                onDuplicate={handleDuplicate}
                onCopy={handleCopy}
                onCut={handleCut}
                onPaste={handlePaste}
                onDelete={handleDelete}
                onToggleLock={handleToggleLock}
                onFocusCamera={handleFocusCamera}
                onCollapse={handleCollapse}
                canPaste={!!clipboard}
                isLocked={lockedObjects.has(id)}
                isDragging={activeId === id}
                isCollapsed={collapsedItems.has(id)}
                indentationWidth={indentationWidth}
                projected={projected}
                isOverParent={
                  projected &&
                  projected.parentId === id &&
                  projected.depth > depth
                }
              />
            ))}
          </div>
        </SortableContext>

        {createPortal(
          <DragOverlay dropAnimation={defaultDropAnimation}>
            {activeId && activeItem ? (
              <div className="bg-background pointer-events-none rounded-lg border px-3 py-1.5 text-sm opacity-90 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{activeItem.object.name}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {flattenedItems.length === 0 && searchQuery && (
        <div className="text-muted-foreground py-4 text-center text-sm">
          No objects match "{searchQuery}"
        </div>
      )}

      {flattenedItems.length === 0 &&
        !searchQuery &&
        scene.objects.length === 0 && (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No objects in scene. Use the + button to add objects.
          </div>
        )}
    </div>
  );
}
