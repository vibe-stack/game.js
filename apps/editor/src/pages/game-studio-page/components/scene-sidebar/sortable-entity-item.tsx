import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";
import { EntityCreator } from "./entity-creator";
import { FlatTreeItem, DropIndicator } from "./tree-utils";

interface SortableEntityItemProps {
  item: FlatTreeItem;
  gameWorldService: React.RefObject<GameWorldService | null>;
  selectedEntity: string | null;
  expandedNodes: Set<string>;
  onSelect: (entityId: string) => void;
  onToggleExpanded: (entityId: string) => void;
  dropIndicator?: DropIndicator | null;
  isDragging?: boolean;
}

export default function SortableEntityItem({
  item,
  gameWorldService,
  selectedEntity,
  expandedNodes,
  onSelect,
  onToggleExpanded,
  dropIndicator,
  isDragging = false,
}: SortableEntityItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.entity.entityName);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: item.entity.entityId,
    data: {
      type: "entity",
      entity: item.entity,
      item: item,
    },
  });

  const isExpanded = expandedNodes.has(item.entity.entityId);
  const hasChildren = item.entity.children.filter(child => child instanceof Entity).length > 0;
  const isSelected = selectedEntity === item.entity.entityId;
  const showDropIndicator = dropIndicator?.targetId === item.entity.entityId;

  const isAtRoot = (): boolean => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    return !item.entity.parent || item.entity.parent === gameWorld?.getScene();
  };

  const handleRemoveEntity = () => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
      if (entitiesRegistry) {
        const entity = entitiesRegistry.get(item.entity.entityId);
        if (entity) {
          entity.destroy();
          entitiesRegistry.remove(item.entity.entityId);
        }
      }
    }
  };

  const handleDuplicateEntity = async () => {
    if (!gameWorldService.current) return;
    
    try {
      await EntityCreator.duplicateEntity(item.entity, gameWorldService.current);
    } catch (error) {
      console.error("Failed to duplicate entity:", error);
    }
  };

  const handleStartRename = () => {
    setIsRenaming(true);
    setRenameValue(item.entity.entityName);
  };

  const handleConfirmRename = () => {
    if (renameValue.trim() && renameValue !== item.entity.entityName) {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (gameWorld) {
        const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
        if (entitiesRegistry) {
          const entity = entitiesRegistry.get(item.entity.entityId);
          if (entity) {
            // Update entity name
            (entity as any).entityName = renameValue.trim();
            // Update the registry entry
            entitiesRegistry.update(item.entity.entityId, { name: renameValue.trim() });
          }
        }
      }
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameValue(item.entity.entityName);
  };

  const handleSendToRoot = () => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
      if (entitiesRegistry) {
        const entity = entitiesRegistry.get(item.entity.entityId);
        if (entity && entity.parent && entity.parent !== gameWorld.getScene()) {
          // Move to scene root
          gameWorld.getScene().add(entity);
        }
      }
    }
  };

  // Focus input when starting rename
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const atRoot = isAtRoot();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const paddingLeft = 8 + item.depth * 16;

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      {/* Drop indicator line */}
      {showDropIndicator && (
        <div className="relative">
          {dropIndicator?.type === 'sibling' && (
            <div 
              className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10"
              style={{ 
                left: `${paddingLeft}px`,
                top: dropIndicator.position === 'after' ? '100%' : '0%'
              }}
            />
          )}
          {dropIndicator?.type === 'child' && (
            <div 
              className="absolute left-0 right-0 h-full bg-blue-500/20 border-2 border-blue-500 border-dashed rounded z-10"
              style={{ left: `${paddingLeft}px` }}
            />
          )}
        </div>
      )}

      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`flex items-center py-1 px-2 mx-1 rounded text-sm cursor-pointer hover:bg-white/10 ${
              isSelected ? "bg-blue-500/20 border border-blue-500/30" : ""
            } ${isSortableDragging ? "opacity-50" : ""}`}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => !isRenaming && onSelect(item.entity.entityId)}
          >
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center w-4 h-4 mr-1 cursor-grab active:cursor-grabbing hover:text-white/80"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3 w-3 opacity-50 hover:opacity-100" />
            </div>

            {/* Expand/collapse button */}
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded(item.entity.entityId);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="h-4 w-4" />
            )}
            
            {/* Entity name */}
            {isRenaming ? (
              <Input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="ml-1 h-6 text-sm bg-white/10 border-white/20 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmRename();
                  } else if (e.key === "Escape") {
                    handleCancelRename();
                  }
                }}
                onBlur={handleConfirmRename}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="ml-1 truncate">{item.entity.entityName}</span>
            )}
            
            {/* Entity type */}
            {!isRenaming && (
              <div className="ml-auto opacity-50">
                <span className="text-xs">{item.entity.metadata.type}</span>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-gray-900 border-gray-700">
          <ContextMenuItem 
            onClick={handleStartRename}
            className="text-gray-200 hover:bg-gray-800"
          >
            Rename
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={handleDuplicateEntity}
            className="text-gray-200 hover:bg-gray-800"
          >
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={handleSendToRoot}
            disabled={atRoot}
            className="text-gray-200 hover:bg-gray-800 disabled:opacity-50"
          >
            Send to Root
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-gray-700" />
          <ContextMenuItem 
            onClick={handleRemoveEntity}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            Remove
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
} 