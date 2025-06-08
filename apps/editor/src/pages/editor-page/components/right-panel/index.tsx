import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ObjectInspector from "./object-inspector";
import SceneSettings from "./scene-settings";

interface RightPanelProps {
  scene: GameScene | null;
  selectedObjects: string[];
}

export default function RightPanel({ scene, selectedObjects }: RightPanelProps) {
  return (
    <div className="absolute right-4 top-20 z-10 w-80 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <Tabs defaultValue="inspector" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-b-none">
          <TabsTrigger value="inspector">Inspector</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inspector" className="p-0 m-0 select-none">
          <ObjectInspector 
            scene={scene}
            selectedObjects={selectedObjects}
          />
        </TabsContent>

        <TabsContent value="settings" className="p-0 m-0">
          <SceneSettings scene={scene} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 