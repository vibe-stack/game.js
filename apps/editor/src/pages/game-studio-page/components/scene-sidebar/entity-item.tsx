import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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

interface SceneTreeNode {
  entity: Entity;
  children: SceneTreeNode[];
  depth: number;
}

interface EntityItemProps {
  node: SceneTreeNode;
  gameWorldService: React.RefObject<GameWorldService | null>;
  selectedEntity: string | null;
  expandedNodes: Set<string>;
  onSelect: (entityId: string) => void;
  onToggleExpanded: (entityId: string) => void;
  onRenderChildren: (children: SceneTreeNode[]) => React.ReactNode;
}

export default function EntityItem({
  node,
  gameWorldService,
  selectedEntity,
  expandedNodes,
  onSelect,
  onToggleExpanded,
  onRenderChildren,
}: EntityItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.entity.entityName);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedNodes.has(node.entity.entityId);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedEntity === node.entity.entityId;

  const isAtRoot = (): boolean => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    return !node.entity.parent || node.entity.parent === gameWorld?.getScene();
  };

  const handleRemoveEntity = () => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
      if (entitiesRegistry) {
        const entity = entitiesRegistry.get(node.entity.entityId);
        if (entity) {
          entity.destroy();
          entitiesRegistry.remove(node.entity.entityId);
        }
      }
    }
  };

  const handleDuplicateEntity = async () => {
    if (!gameWorldService.current) return;
    
    try {
      await EntityCreator.duplicateEntity(node.entity, gameWorldService.current);
    } catch (error) {
      console.error("Failed to duplicate entity:", error);
    }
  };

  const handleStartRename = () => {
    setIsRenaming(true);
    setRenameValue(node.entity.entityName);
  };

  const handleConfirmRename = () => {
    if (renameValue.trim() && renameValue !== node.entity.entityName) {
      const gameWorld = gameWorldService.current?.getGameWorld();
      if (gameWorld) {
        const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
        if (entitiesRegistry) {
          const entity = entitiesRegistry.get(node.entity.entityId);
          if (entity) {
            // Update entity name
            (entity as any).entityName = renameValue.trim();
            // Update the registry entry
            entitiesRegistry.update(node.entity.entityId, { name: renameValue.trim() });
          }
        }
      }
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameValue(node.entity.entityName);
  };

  const handleSendToRoot = () => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
      if (entitiesRegistry) {
        const entity = entitiesRegistry.get(node.entity.entityId);
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

  return (
    <div className="select-none">
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`flex items-center py-1 px-2 mx-1 rounded text-sm cursor-pointer hover:bg-white/10 ${
              isSelected ? "bg-blue-500/20 border border-blue-500/30" : ""
            }`}
            style={{ paddingLeft: `${8 + node.depth * 16}px` }}
            onClick={() => !isRenaming && onSelect(node.entity.entityId)}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded(node.entity.entityId);
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
              <span className="ml-1 truncate">{node.entity.entityName}</span>
            )}
            
            {!isRenaming && (
              <div className="ml-auto opacity-50">
                <span className="text-xs">{node.entity.metadata.type}</span>
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
      {hasChildren && isExpanded && (
        <div>
          {onRenderChildren(node.children)}
        </div>
      )}
    </div>
  );
} 