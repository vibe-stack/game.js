import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SceneTree from "./scene-tree";
import AssetsPanel from "./assets-panel";

interface LeftPanelProps {
  scene: GameScene | null;
  selectedObjects: string[];
  onSelectObject: (objectId: string) => void;
}

export default function LeftPanel({ scene, selectedObjects, onSelectObject }: LeftPanelProps) {
  return (
    <div className="absolute left-4 top-20 z-10 w-80 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <Tabs defaultValue="hierarchy" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-b-none">
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="p-0 m-0">
          <SceneTree 
            scene={scene}
            selectedObjects={selectedObjects}
            onSelectObject={onSelectObject}
          />
        </TabsContent>

        <TabsContent value="assets" className="p-0 m-0">
          <AssetsPanel scene={scene} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 