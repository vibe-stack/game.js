import React from "react";
import { useDevServerStore } from "../stores/dev-server-store";
import { useSceneStore } from "../stores/scene-store";

interface SceneFrameProps {
  projectName: string;
}

export function SceneFrame({ projectName }: SceneFrameProps) {
  const { isRunning, serverInfo } = useDevServerStore();
  const { currentRoute } = useSceneStore();

  if (!isRunning || !serverInfo?.url) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold">Game Editor</h2>
          <p className="text-muted-foreground mb-4">
            The visual editor for {projectName} will be implemented here
          </p>
          <p className="text-muted-foreground text-sm">
            Start the dev server to begin editing your game
          </p>
        </div>
      </div>
    );
  }

  const sceneUrl = currentRoute && currentRoute !== '/' 
    ? `${serverInfo.url}${currentRoute}`
    : serverInfo.url;

  return (
    <div className="flex-1 relative">
      <iframe
        src={sceneUrl}
        className="w-full h-full border-0"
        title="Game Scene"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
      
      {/* Overlay for debugging */}
      <div className="absolute top-4 right-4 bg-black/80 text-white px-2 py-1 rounded text-xs">
        Scene: {currentRoute || '/'}
      </div>
    </div>
  );
} 