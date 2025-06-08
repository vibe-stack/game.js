import React from "react";
import useEditorStore from "@/stores/editor-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ObjectInspector from "./object-inspector";
import SceneSettings from "./scene-settings";
import PhysicsSettings from "./physics-settings";

interface RightPanelProps {
  scene: GameScene | null;
  selectedObjects: string[];
}

export default function RightPanel({ scene, selectedObjects }: RightPanelProps) {
  const { physicsState } = useEditorStore();

  return (
    <div 
      className={`absolute right-4 top-20 z-10 w-80 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg transition-all duration-300 ease-in-out ${
        physicsState === 'playing' 
          ? 'opacity-0 translate-x-5 pointer-events-none' 
          : 'opacity-100 translate-x-0'
      }`}
    >
      <Tabs defaultValue="inspector" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-b-none">
          <TabsTrigger value="inspector">Inspector</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="physics">Physics</TabsTrigger>
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

        <TabsContent value="physics" className="p-0 m-0">
          <PhysicsSettings scene={scene} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 