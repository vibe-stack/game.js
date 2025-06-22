import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Entity } from "@/models";
import { GameWorldService } from "../../services/game-world-service";
import useGameStudioStore from "@/stores/game-studio-store";
import SceneTree from "./scene-tree";
import AddEntityMenu from "./add-entity-menu";
import { motion } from "motion/react";

interface SceneSidebarProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export default function SceneSidebar({ gameWorldService }: SceneSidebarProps) {
  const [activeTab, setActiveTab] = useState("scene");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sceneEntities, setSceneEntities] = useState<Entity[]>([]);
  const { selectedEntity, setSelectedEntity, gameState } = useGameStudioStore();

  // Poll for scene entities periodically and when entities are added
  const updateEntities = React.useCallback(() => {
    const gameWorld = gameWorldService.current?.getGameWorld();
    if (gameWorld) {
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
    }
  }, [gameWorldService]);

  useEffect(() => {
    updateEntities();
    const interval = setInterval(updateEntities, 1000); // Update every second

    return () => clearInterval(interval);
  }, [updateEntities]);

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

  return (
    <motion.div
      initial={{ x: -100, opacity: 1 }}
      animate={{
        x: gameState === "playing" ? -300 : 0,
        opacity: gameState === "playing" ? 0 : 1,
      }}
      transition={{ duration: 0.5 }}
      className="fixed top-32 bottom-32 left-4 z-40 w-80 overflow-hidden rounded-lg border border-white/10 bg-black/20 backdrop-blur-md"
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
          className="m-2 flex flex-1 flex-col space-y-2"
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
              onEntityAdded={updateEntities}
            />
          </div>

          <SceneTree
            sceneEntities={sceneEntities}
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
          <div className="p-4 text-center text-gray-400">
            Files panel coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
