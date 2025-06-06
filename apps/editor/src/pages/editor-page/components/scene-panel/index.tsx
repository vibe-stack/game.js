import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Layers, Wifi, WifiOff } from "lucide-react";
import { SceneSelector } from "./scene-selector";
import { AddObjectMenu } from "./add-object-menu";
import { ObjectTree } from "./object-tree";
import { useSceneStore } from "../../stores/scene-store";
import { useEditorConnectionStore } from "../../stores/editor-connection-store";

interface ScenePanelProps {
  projectName: string;
}

export function ScenePanel({ projectName }: ScenePanelProps) {
  const { currentRoute, loadSceneRoutes, loadSceneObjects } = useSceneStore();
  const { isConnected, connectionStatus } = useEditorConnectionStore();

  useEffect(() => {
    loadSceneRoutes(projectName);
  }, [projectName, loadSceneRoutes]);

  useEffect(() => {
    if (currentRoute) {
      loadSceneObjects(currentRoute);
    }
  }, [currentRoute, loadSceneObjects]);

  const currentScenePath = currentRoute || '/';

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="fixed left-4 top-20 bottom-4 w-80 z-50 overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers size={16} />
          Scene
          <div className="flex items-center gap-1 ml-auto">
            {isConnected ? (
              <Badge variant="secondary" className="text-xs gap-1">
                <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`} />
                <Wifi size={10} />
                Live
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1">
                <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`} />
                <WifiOff size={10} />
                Offline
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto space-y-4">
        <SceneSelector />
        
        {currentRoute && (
          <>
            <Separator />
            <AddObjectMenu scenePath={currentScenePath} />
            <Separator />
            <ObjectTree />
          </>
        )}
      </CardContent>
    </Card>
  );
} 