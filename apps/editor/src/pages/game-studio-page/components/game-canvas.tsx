import React, { useEffect, useRef } from "react";
import useGameStudioStore from "@/stores/game-studio-store";
import { GameWorldService } from "../services/game-world-service";

interface GameCanvasProps {
  gameWorldService: React.MutableRefObject<GameWorldService | null>;
}

export default function GameCanvas({ gameWorldService }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    currentProject, 
    isLoading, 
    setLoading, 
    setError,
    shouldLoadScene,
    currentSceneName,
    setShouldLoadScene,
    setCurrentSceneName,
    setGameWorldService
  } = useGameStudioStore();

  // Initialize game world when project is available
  useEffect(() => {
    if (!currentProject || !canvasRef.current) return;

    const initializeCanvas = async () => {
      try {
        setLoading(true);
        
        if (!gameWorldService.current) {
          gameWorldService.current = new GameWorldService();
          // Set the service in the store so other components can access it
          setGameWorldService(gameWorldService.current);
        }

        await gameWorldService.current.initialize(canvasRef.current!);
        
        // Initialize the game world, but don't load any scene yet
        // Scene loading will be handled by the separate effect below
        console.log("GameWorld initialized successfully");
        setLoading(false);
        
        // Trigger initial scene load based on project
        if (currentProject.currentScene) {
          console.log("Project has current scene:", currentProject.currentScene);
          setCurrentSceneName(currentProject.currentScene);
          setShouldLoadScene(true);
        } else if (currentProject.scenes && currentProject.scenes.length > 0) {
          console.log("Loading first available scene:", currentProject.scenes[0]);
          setCurrentSceneName(currentProject.scenes[0]);
          setShouldLoadScene(true);
        } else {
          console.log("No project scenes found, will wait for user to load scene");
        }
      } catch (error) {
        console.error("Failed to initialize canvas:", error);
        setError(`Failed to initialize: ${error instanceof Error ? error.message : "Unknown error"}`);
        setLoading(false);
      }
    };

    initializeCanvas();

    // Cleanup function
    return () => {
      if (gameWorldService.current) {
        gameWorldService.current.stop();
        setGameWorldService(null);
      }
    };
  }, [currentProject, setLoading, setError, gameWorldService, setCurrentSceneName, setShouldLoadScene, setGameWorldService]);

  // Handle scene loading when shouldLoadScene changes
  useEffect(() => {
    if (!shouldLoadScene || !gameWorldService.current || !currentSceneName || !currentProject) return;

    const loadSceneAsync = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (currentSceneName === "Demo Scene") {
          console.log("Loading demo scene");
          await gameWorldService.current!.loadDefaultScene();
        } else {
          console.log("Loading project scene via file system:", currentSceneName);
          // Load scene JSON data via file system
          const scenePath = `${currentProject.path}/scenes/${currentSceneName}.json`;
          const sceneContent = await window.projectAPI.readFile(scenePath);
          const sceneData = JSON.parse(sceneContent);
          console.log("Scene data loaded, now loading into game world:", sceneData);
          // Pass the actual JSON data to the service
          await gameWorldService.current!.loadScene(sceneData);
        }

        console.log("Scene loaded successfully");
        console.log("GameWorld entities count:", gameWorldService.current!.getGameWorld()?.getRegistryManager().getRegistry("entities")?.size() || 0);
        
        setShouldLoadScene(false); // Reset the flag
        setLoading(false);
      } catch (error) {
        console.error("Failed to load scene:", error);
        setError(`Failed to load scene: ${error instanceof Error ? error.message : "Unknown error"}`);
        setShouldLoadScene(false);
        setLoading(false);
      }
    };

    loadSceneAsync();
  }, [shouldLoadScene, currentSceneName, currentProject, setLoading, setError, setShouldLoadScene]);

  // Handle canvas resize
  // useEffect(() => {
  //   const handleResize = () => {
  //     if (canvasRef.current && gameWorldService.current) {
  //       const rect = canvasRef.current.getBoundingClientRect();
  //       const width = rect.width;
  //       const height = rect.height;
        
  //       // Set canvas display size (CSS pixels)
  //       canvasRef.current.style.width = `${width}px`;
  //       canvasRef.current.style.height = `${height}px`;
        
  //       // Set canvas buffer size (actual pixels)
  //       const pixelRatio = window.devicePixelRatio || 1;
  //       canvasRef.current.width = width * pixelRatio;
  //       canvasRef.current.height = height * pixelRatio;
        
  //       // Update the renderer size
  //       gameWorldService.current.getGameWorld()?.resize(width, height);
  //     }
  //   };

  //   window.addEventListener('resize', handleResize);
    
  //   // Initial resize with a small delay to ensure canvas is mounted
  //   const timeoutId = setTimeout(handleResize, 100);

  //   return () => {
  //     window.removeEventListener('resize', handleResize);
  //     clearTimeout(timeoutId);
  //   };
  // }, [gameWorldService]);

  return (
    <div className="absolute inset-0 pt-12">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: 'block' }}
      />
    </div>
  );
} 