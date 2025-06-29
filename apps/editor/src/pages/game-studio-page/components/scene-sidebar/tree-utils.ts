import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";

export interface FlatTreeItem {
  entity: Entity;
  parentId: string | null;
  depth: number;
  index: number;
  ancestorIds: string[];
}

export interface TreeNode {
  entity: Entity;
  children: TreeNode[];
  depth: number;
}

export class TreeUtils {
  /**
   * Flattens a hierarchical tree structure into a flat array for dnd-kit
   */
  static flattenTree(entities: Entity[], gameWorldService: React.RefObject<GameWorldService | null>): FlatTreeItem[] {
    const flatItems: FlatTreeItem[] = [];
    const scene = gameWorldService.current?.getGameWorld()?.getScene();
    
    const addEntity = (entity: Entity, parentId: string | null, depth: number, ancestorIds: string[]) => {
      flatItems.push({
        entity,
        parentId,
        depth,
        index: flatItems.length,
        ancestorIds: [...ancestorIds]
      });

      // Add children
      const children = entity.children.filter(child => child instanceof Entity) as Entity[];
      children.forEach(child => {
        addEntity(child, entity.entityId, depth + 1, [...ancestorIds, entity.entityId]);
      });
    };

    // Find root entities (those directly attached to scene or with no valid parent in our list)
    const rootEntities = entities.filter(entity => {
      if (!entity.parent || entity.parent === scene) return true;
      return !entities.find(e => e === entity.parent);
    });

    rootEntities.forEach(entity => {
      addEntity(entity, null, 0, []);
    });

    return flatItems;
  }

  /**
   * Rebuilds tree structure from flat items
   */
  static buildTreeFromFlat(flatItems: FlatTreeItem[]): TreeNode[] {
    const rootNodes: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();

    // Create all nodes first
    flatItems.forEach(item => {
      nodeMap.set(item.entity.entityId, {
        entity: item.entity,
        children: [],
        depth: item.depth
      });
    });

    // Build hierarchy
    flatItems.forEach(item => {
      const node = nodeMap.get(item.entity.entityId)!;
      
      if (item.parentId) {
        const parent = nodeMap.get(item.parentId);
        if (parent) {
          parent.children.push(node);
          node.depth = parent.depth + 1;
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  /**
   * Checks if an entity can be moved to a target position
   */
  static canMoveTo(
    activeId: string, 
    overId: string, 
    flatItems: FlatTreeItem[]
  ): boolean {
    const overItem = flatItems.find(item => item.entity.entityId === overId);
    
    if (!overItem) return false;
    
    // Can't move to itself
    if (activeId === overId) return false;
    
    // Can't move to its own descendants
    return !overItem.ancestorIds.includes(activeId);
  }

  /**
   * Handles the drag end operation and updates the game engine
   */
  static async handleDragEnd(
    activeId: string,
    overId: string | null,
    flatItems: FlatTreeItem[],
    gameWorldService: React.RefObject<GameWorldService | null>,
    onUpdate?: () => void
  ): Promise<boolean> {
    console.log("TreeUtils.handleDragEnd called", { activeId, overId });
    
    if (!overId || !gameWorldService.current) {
      console.log("Invalid drag end: missing overId or gameWorldService");
      return false;
    }

    const gameWorld = gameWorldService.current.getGameWorld();
    if (!gameWorld) {
      console.log("No game world available");
      return false;
    }

    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) {
      console.log("No entities registry available");
      return false;
    }

    const activeEntity = entitiesRegistry.get(activeId);
    if (!activeEntity) {
      console.log("Active entity not found:", activeId);
      return false;
    }

    // Check if move is valid
    if (!this.canMoveTo(activeId, overId, flatItems)) {
      console.log("Invalid move detected");
      return false;
    }

    const activeItem = flatItems.find(item => item.entity.entityId === activeId);
    const overItem = flatItems.find(item => item.entity.entityId === overId);
    
    if (!activeItem || !overItem) {
      console.log("Missing active or over item");
      return false;
    }

    try {
      console.log("Executing drag operation...");
      
      // Determine the drop operation type
      const dropResult = this.getDropOperation(activeItem, overItem, flatItems);
      console.log("Drop operation:", dropResult);
      
      await this.executeDropOperation(dropResult, activeEntity, gameWorld, entitiesRegistry);
      
      console.log("Drag operation completed successfully");
      
      // Trigger UI update
      if (onUpdate) {
        onUpdate();
      }
      
      return true;
    } catch (error) {
      console.error("Failed to handle drag end:", error);
      return false;
    }
  }

  /**
   * Determines the type of drop operation needed
   */
  private static getDropOperation(
    activeItem: FlatTreeItem,
    overItem: FlatTreeItem,
    flatItems: FlatTreeItem[]
  ): DropOperation {
    const overEntity = overItem.entity;
    
    console.log("Determining drop operation:", {
      activeItem: activeItem.entity.entityName,
      activeDepth: activeItem.depth,
      overItem: overItem.entity.entityName,
      overDepth: overItem.depth
    });
    
    // For now, let's default to making parent-child relationships
    // This will allow any entity to become a parent by having something dropped on it
    console.log("Making child relationship - any entity can become a parent");
    return {
      type: 'child',
      target: overEntity,
      position: 'first'
    };
  }

  /**
   * Executes the drop operation in the game engine
   */
  private static async executeDropOperation(
    operation: DropOperation,
    activeEntity: Entity,
    gameWorld: any,
    entitiesRegistry: any
  ): Promise<void> {
    const scene = gameWorld.getScene();
    
    console.log("Executing drop operation:", {
      type: operation.type,
      activeEntity: activeEntity.entityName,
      target: operation.target.entityName,
      position: operation.position
    });
    
    // Always remove from current parent first
    if (activeEntity.parent) {
      console.log("Removing from current parent:", activeEntity.parent);
      activeEntity.parent.remove(activeEntity);
    }
    
    if (operation.type === 'child') {
      console.log("Adding as child to:", operation.target.entityName);
      // Add as child to target
      operation.target.add(activeEntity);
    } else if (operation.type === 'sibling') {
      const targetParent = operation.target.parent;
      console.log("Adding as sibling, target parent:", targetParent === scene ? "scene" : targetParent);
      
      if (targetParent && targetParent !== scene) {
        // Add to target's parent
        targetParent.add(activeEntity);
        
        // Reorder within the parent if needed
        const children = targetParent.children;
        const targetIndex = children.indexOf(operation.target);
        const activeIndex = children.indexOf(activeEntity);
        
        console.log("Reordering siblings:", { targetIndex, activeIndex, position: operation.position });
        
        if (targetIndex !== -1 && activeIndex !== -1) {
          const newIndex = operation.position === 'after' ? targetIndex + 1 : targetIndex;
          
          // Reorder in THREE.js children array
          if (newIndex !== activeIndex) {
            children.splice(activeIndex, 1);
            const insertIndex = activeIndex < newIndex ? newIndex - 1 : newIndex;
            children.splice(insertIndex, 0, activeEntity);
            console.log("Reordered from", activeIndex, "to", insertIndex);
          }
        }
      } else {
        // Add to scene root
        console.log("Adding to scene root");
        scene.add(activeEntity);
      }
    }
    
    console.log("Drop operation completed. New parent:", activeEntity.parent);
  }

  /**
   * Gets the projected drop indicator position
   */
  static getDropIndicator(
    activeId: string,
    overId: string | null,
    flatItems: FlatTreeItem[]
  ): DropIndicator | null {
    if (!overId || !this.canMoveTo(activeId, overId, flatItems)) {
      return null;
    }

    const overItem = flatItems.find(item => item.entity.entityId === overId);
    if (!overItem) return null;

    const activeItem = flatItems.find(item => item.entity.entityId === activeId);
    if (!activeItem) return null;

    const operation = this.getDropOperation(activeItem, overItem, flatItems);
    
    return {
      targetId: overId,
      type: operation.type,
      position: operation.position
    };
  }
}

interface DropOperation {
  type: 'child' | 'sibling';
  target: Entity;
  position: 'first' | 'after' | 'before';
}

export interface DropIndicator {
  targetId: string;
  type: 'child' | 'sibling';
  position: 'first' | 'after' | 'before';
} 