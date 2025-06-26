import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";
import useGameStudioStore from "@/stores/game-studio-store";
import SceneTree from "./scene-tree";
import AddEntityMenu from "./add-entity-menu";
import FileBrowser from "./file-browser";
import { motion } from "motion/react";
import { EntityCreator } from "./entity-creator";

interface SceneSidebarProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export interface CameraItem {
  id: string;
  name: string;
  type: "camera";
  metadata: { tags: string[] };
}

export default function SceneSidebar({ gameWorldService }: SceneSidebarProps) {
  const [activeTab, setActiveTab] = useState("scene");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sceneEntities, setSceneEntities] = useState<Entity[]>([]);
  const [sceneCameras, setSceneCameras] = useState<CameraItem[]>([]);
  const [copiedEntity, setCopiedEntity] = useState<Entity | null>(null);
  const { selectedEntity, setSelectedEntity, gameState } = useGameStudioStore();

  // Poll for scene entities and cameras periodically and when entities are added
  const updateEntities = React.useCallback(() => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
      // Update entities
      const entitiesRegistry = gameWorld
        .getRegistryManager()
        .getRegistry<Entity>("entities");
      if (entitiesRegistry) {
        const entities = entitiesRegistry.getAllItems();
        setSceneEntities(entities);

        // Refresh entity interactions when entities are updated
        const selectionManager =
          gameWorldService.current?.getSelectionManager();
        selectionManager?.refreshInteractions();
      }

      // Update cameras
      const cameraManager = gameWorld.getCameraManager();
      const allCameras = cameraManager.getAllCameras();
      
      // Filter out the editor camera to get only scene cameras
      // Use the static constant from EditorCameraService instead of accessing the service
      const editorCameraId = "__editor_orbit_camera__";
      const sceneCamerasData = allCameras
        .filter(cam => cam.id !== editorCameraId)
        .map(cam => ({
          id: cam.id,
          name: cam.name,
          type: "camera" as const,
          metadata: { tags: ['camera'] }
        }));
      
      setSceneCameras(sceneCamerasData);
    }
  }, [gameWorldService]);

  useEffect(() => {
    updateEntities();
    const interval = setInterval(updateEntities, 1000); // Update every second

    return () => clearInterval(interval);
  }, [updateEntities]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((event.metaKey || event.ctrlKey)) {
        switch (event.key.toLowerCase()) {
          case 'c':
            // Copy selected entity
            if (selectedEntity) {
              event.preventDefault();
              const gameWorld = gameWorldService.current?.getGameWorld();
              if (gameWorld) {
                const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
                if (entitiesRegistry) {
                  const entity = entitiesRegistry.get(selectedEntity);
                  if (entity) {
                    setCopiedEntity(entity);
                  }
                }
              }
            }
            break;
          case 'v':
            // Paste copied entity
            if (copiedEntity && gameWorldService.current) {
              event.preventDefault();
              handlePasteEntity();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntity, copiedEntity, gameWorldService]);

  const handlePasteEntity = async () => {
    if (!copiedEntity || !gameWorldService.current) return;
    
    try {
      const duplicatedEntity = await EntityCreator.duplicateEntity(copiedEntity, gameWorldService.current);
      if (duplicatedEntity) {
        // Select the newly pasted entity
        setSelectedEntity(duplicatedEntity.entityId);
      }
    } catch (error) {
      console.error("Failed to paste entity:", error);
    }
  };

  const toggleExpanded = (entityId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const handleEntityAdded = () => {
    updateEntities();
  };

  return (
    <motion.div
      initial={{ x: -100, opacity: 1 }}
      animate={{
        x: gameState === "playing" ? -300 : 0,
        opacity: gameState === "playing" ? 0 : 1,
      }}
      transition={{ duration: 0.5 }}
      className="fixed top-32 bottom-32 left-4 z-40 w-80 rounded-lg border border-white/10 bg-black/60 backdrop-blur-md"
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-full flex-col"
      >
        <TabsList className="m-2 mb-0 grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger
            value="scene"
            className="text-white data-[state=active]:bg-white/20"
          >
            Scene
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="text-white data-[state=active]:bg-white/20"
          >
            Assets
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="text-white data-[state=active]:bg-white/20"
          >
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="scene"
          className="m-2 flex flex-1 flex-col space-y-2 max-h-full overflow-hidden"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search scene..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-gray-400"
              />
            </div>
            <AddEntityMenu
              gameWorldService={gameWorldService}
              onEntityAdded={handleEntityAdded}
            />
          </div>

          {copiedEntity && (
            <div className="mt-2 text-xs text-gray-400">
              Copied: {copiedEntity.entityName} (Cmd+V to paste)
            </div>
          )}

          <SceneTree
            sceneEntities={sceneEntities}
            sceneCameras={sceneCameras}
            gameWorldService={gameWorldService}
            selectedEntity={selectedEntity}
            expandedNodes={expandedNodes}
            searchQuery={searchQuery}
            onSelect={setSelectedEntity}
            onToggleExpanded={toggleExpanded}
          />
        </TabsContent>

        <TabsContent value="assets" className="m-2 flex-1">
          <div className="p-4 text-center text-gray-400">
            Assets panel coming soon...
          </div>
        </TabsContent>

        <TabsContent value="files" className="m-2 flex-1">
          <FileBrowser gameWorldService={gameWorldService} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
