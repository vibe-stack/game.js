import React, { useMemo } from "react";
import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";
import EntityItem from "./entity-item";
import type { CameraItem } from "./index";

export interface SceneTreeNode {
  entity: Entity;
  children: SceneTreeNode[];
  depth: number;
}

export interface CameraTreeNode {
  camera: CameraItem;
  depth: number;
}

interface SceneTreeProps {
  sceneEntities: Entity[];
  sceneCameras: CameraItem[];
  gameWorldService: React.RefObject<GameWorldService | null>;
  selectedEntity: string | null;
  expandedNodes: Set<string>;
  searchQuery: string;
  onSelect: (entityId: string) => void;
  onToggleExpanded: (entityId: string) => void;
}

export default function SceneTree({
  sceneEntities,
  sceneCameras,
  gameWorldService,
  selectedEntity,
  expandedNodes,
  searchQuery,
  onSelect,
  onToggleExpanded,
}: SceneTreeProps) {
  // Build tree structure from flat entity list
  const sceneTree = useMemo(() => {
    if (!sceneEntities.length) return [];

    const rootNodes: SceneTreeNode[] = [];
    const entityMap = new Map<string, SceneTreeNode>();

    // Create nodes for all entities
    sceneEntities.forEach((entity) => {
      entityMap.set(entity.entityId, {
        entity,
        children: [],
        depth: 0,
      });
    });

    // Build hierarchy - check if entity has a parent that's also an Entity
    sceneEntities.forEach((entity) => {
      const node = entityMap.get(entity.entityId)!;
      
      // Check if parent exists and is an Entity (not the scene itself)
      if (entity.parent && entity.parent !== gameWorldService.current?.getGameWorld()?.getScene()) {
        // Try to find parent in our entity list
        const parentEntity = sceneEntities.find(e => e === entity.parent);
        if (parentEntity) {
          const parentNode = entityMap.get(parentEntity.entityId);
          if (parentNode) {
            parentNode.children.push(node);
            node.depth = parentNode.depth + 1;
            return; // Don't add to root
          }
        }
      }
      
      // Add to root if no valid parent found
      rootNodes.push(node);
    });

    return rootNodes;
  }, [sceneEntities, gameWorldService]);

  // Build camera nodes
  const cameraNodes = useMemo(() => {
    return sceneCameras.map(camera => ({
      camera,
      depth: 0,
    }));
  }, [sceneCameras]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return sceneTree;

    const filterNode = (node: SceneTreeNode): SceneTreeNode | null => {
      const nameMatch = node.entity.entityName.toLowerCase().includes(searchQuery.toLowerCase());
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as SceneTreeNode[];
      
      if (nameMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return sceneTree.map(filterNode).filter(Boolean) as SceneTreeNode[];
  }, [sceneTree, searchQuery]);

  // Filter cameras based on search query
  const filteredCameras = useMemo(() => {
    if (!searchQuery.trim()) return cameraNodes;
    
    return cameraNodes.filter(node => 
      node.camera.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cameraNodes, searchQuery]);

  const renderTreeNodes = (nodes: SceneTreeNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <EntityItem
        key={node.entity.entityId}
        node={node}
        gameWorldService={gameWorldService}
        selectedEntity={selectedEntity}
        expandedNodes={expandedNodes}
        onSelect={onSelect}
        onToggleExpanded={onToggleExpanded}
        onRenderChildren={renderTreeNodes}
      />
    ));
  };

  const renderCameraNodes = (nodes: CameraTreeNode[]): React.ReactNode => {
    return nodes.map((node) => (
      <div
        key={node.camera.id}
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/10 rounded ${
          selectedEntity === node.camera.id ? "bg-white/20" : ""
        }`}
        onClick={() => onSelect(node.camera.id)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="text-blue-400">📷</div>
          <span className="text-sm text-white truncate">{node.camera.name}</span>
          <span className="text-xs text-gray-400">camera</span>
        </div>
      </div>
    ));
  };

  const totalItems = sceneEntities.length + sceneCameras.length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-xs text-gray-400 px-2 py-1 border-b border-white/10">
        Scene Hierarchy ({totalItems} items)
      </div>
      {(filteredTree.length > 0 || filteredCameras.length > 0) ? (
        <div className="py-1">
          {filteredCameras.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-400 px-2 py-1 font-medium">Cameras</div>
              {renderCameraNodes(filteredCameras)}
            </div>
          )}
          {filteredTree.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 px-2 py-1 font-medium">Entities</div>
              {renderTreeNodes(filteredTree)}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-center text-gray-400 text-sm">
          {searchQuery ? "No items match your search" : "No items in scene"}
        </div>
      )}
    </div>
  );
} 