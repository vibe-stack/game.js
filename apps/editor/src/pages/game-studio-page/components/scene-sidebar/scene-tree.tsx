import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";
import SortableEntityItem from "./sortable-entity-item";
import { TreeUtils, FlatTreeItem, DropIndicator } from "./tree-utils";

export interface SceneTreeNode {
  entity: Entity;
  children: SceneTreeNode[];
  depth: number;
}

interface SceneTreeProps {
  sceneEntities: Entity[];
  gameWorldService: React.RefObject<GameWorldService | null>;
  selectedEntity: string | null;
  expandedNodes: Set<string>;
  searchQuery: string;
  onSelect: (entityId: string) => void;
  onToggleExpanded: (entityId: string) => void;
  onEntitiesChanged?: () => void;
}

export default function SceneTree({
  sceneEntities,
  gameWorldService,
  selectedEntity,
  expandedNodes,
  searchQuery,
  onSelect,
  onToggleExpanded,
  onEntitiesChanged,
}: SceneTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  // Flatten entities for DnD
  const flatItems = useMemo(() => {
    return TreeUtils.flattenTree(sceneEntities, gameWorldService);
  }, [sceneEntities, gameWorldService]);



  // Filter flat items based on search query and expanded state
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show all items but respect expanded state for hierarchy
      return flatItems.filter(item => {
        // Always show root items
        if (item.depth === 0) return true;
        
        // For nested items, check if all ancestors are expanded
        for (const ancestorId of item.ancestorIds) {
          if (!expandedNodes.has(ancestorId)) {
            return false;
          }
        }
        return true;
      });
    }

    // When searching, show items that match or have matching descendants
    const matchingIds = new Set<string>();
    const query = searchQuery.toLowerCase();
    
    // First pass: find all items that match the search
    flatItems.forEach(item => {
      if (item.entity.entityName.toLowerCase().includes(query)) {
        matchingIds.add(item.entity.entityId);
        // Also include all ancestors so the path is visible
        item.ancestorIds.forEach(ancestorId => matchingIds.add(ancestorId));
      }
    });

    return flatItems.filter(item => matchingIds.has(item.entity.entityId));
  }, [flatItems, searchQuery, expandedNodes]);

  // Set up sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !active) {
      setOverId(null);
      setDropIndicator(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    
    setOverId(overId);
    
    // Update drop indicator
    const indicator = TreeUtils.getDropIndicator(activeId, overId, flatItems);
    setDropIndicator(indicator);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);
    setDropIndicator(null);

    if (!over || !active) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Handle the drag end in the game engine
    try {
      const success = await TreeUtils.handleDragEnd(activeId, overId, flatItems, gameWorldService, onEntitiesChanged);
      console.log("Drag operation result:", success);
    } catch (error) {
      console.error("Failed to handle drag end:", error);
    }
  };

  const totalItems = sceneEntities.length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="text-xs text-gray-400 px-2 py-1 border-b border-white/10">
        Scene Hierarchy ({totalItems} items)
      </div>
      {filteredItems.length > 0 ? (
        <div className="py-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map(item => item.entity.entityId)}
              strategy={verticalListSortingStrategy}
            >
              {filteredItems.map((item) => (
                <SortableEntityItem
                  key={item.entity.entityId}
                  item={item}
                  gameWorldService={gameWorldService}
                  selectedEntity={selectedEntity}
                  expandedNodes={expandedNodes}
                  onSelect={onSelect}
                  onToggleExpanded={onToggleExpanded}
                  dropIndicator={dropIndicator}
                  isDragging={activeId === item.entity.entityId}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-400 text-sm">
          {searchQuery ? "No items match your search" : "No items in scene"}
        </div>
      )}
    </div>
  );
} 