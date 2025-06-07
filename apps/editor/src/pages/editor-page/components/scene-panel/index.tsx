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
  const { currentRoute, currentFilePath, loadSceneRoutes, loadSceneObjects, requestSceneState } = useSceneStore();
  const { isConnected, connectionStatus } = useEditorConnectionStore();

  useEffect(() => {
    loadSceneRoutes(projectName);
  }, [projectName, loadSceneRoutes]);

  useEffect(() => {
    if (currentFilePath) {
      loadSceneObjects(currentFilePath);
    }
  }, [currentFilePath, loadSceneObjects]);

  // Auto-request scene state when WebSocket connects and we have a scene
  useEffect(() => {
    if (isConnected && currentFilePath) {
      console.log('WebSocket connected and scene selected, requesting scene state...');
      // Use a longer delay and only request once per connection + file path combo
      const timeoutId = setTimeout(() => {
        requestSceneState();
      }, 2000); // Longer delay to ensure game is fully ready
      
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, currentFilePath]); // Removed requestSceneState from deps to prevent reruns

  const currentScenePath = currentFilePath || '';

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="fixed left-8 top-32 bottom-4 w-80 max-h-[70vh] z-50 overflow-hidden flex flex-col">
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
        
        {currentRoute && currentFilePath && (
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