import React, { useEffect } from "react";
import { useDevServerStore } from "../stores/dev-server-store";
import { useSceneStore } from "../stores/scene-store";

interface SceneFrameProps {
  projectName: string;
}

export function SceneFrame({ projectName }: SceneFrameProps) {
  const { isRunning, serverInfo } = useDevServerStore();
  const { currentRoute } = useSceneStore();

  console.log(`SceneFrame render - isRunning: ${isRunning}, serverInfo:`, serverInfo);

  // Debug server info changes
  useEffect(() => {
    console.log(`SceneFrame useEffect - Server info changed:`, { isRunning, serverInfo, projectName });
  }, [isRunning, serverInfo, projectName]);

  if (!isRunning || !serverInfo?.url) {
    return (
      <div className="bg-muted/50 flex flex-1 items-center justify-center h-full">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold">Game Editor</h2>
          <p className="text-muted-foreground text-sm">
            Start the dev server to begin editing your game
          </p>
        </div>
      </div>
    );
  }

  const sceneUrl =
    currentRoute && currentRoute !== "/"
      ? `${serverInfo.url}${currentRoute}`
      : serverInfo.url;

  console.log(`SceneFrame loading URL: ${sceneUrl}`);

  return (
    <div className="relative flex-1 h-full w-full">
      <iframe
        src={sceneUrl}
        className="h-full w-full border-0"
        title="Game Scene"
        onLoad={(e) => {
          console.log(`SceneFrame iframe loaded successfully: ${sceneUrl}`, e);
        }}
        onError={(e) => {
          console.error(`SceneFrame iframe failed to load: ${sceneUrl}`, e);
        }}
      />
    </div>
  );
}
