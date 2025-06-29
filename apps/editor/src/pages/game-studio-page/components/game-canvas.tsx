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
        
        // Wait for canvas to be properly sized by React/CSS
        await new Promise(resolve => {
          const checkSize = () => {
            if (canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                resolve(undefined);
              } else {
                requestAnimationFrame(checkSize);
              }
            }
          };
          checkSize();
        });
        
        if (!gameWorldService.current) {
          gameWorldService.current = new GameWorldService();
          // Set the service in the store so other components can access it
          setGameWorldService(gameWorldService.current);
        }

        await gameWorldService.current.initialize(canvasRef.current!);
        
        // Initialize the game world, but don't load any scene yet
        // Scene loading will be handled by the separate effect below
        setLoading(false);
        
        // Trigger initial scene load based on project
        if (currentProject.currentScene) {
          setCurrentSceneName(currentProject.currentScene);
          setShouldLoadScene(true);
        } else if (currentProject.scenes && currentProject.scenes.length > 0) {
          setCurrentSceneName(currentProject.scenes[0]);
          setShouldLoadScene(true);
        } else {
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
          await gameWorldService.current!.loadDefaultScene();
        } else {
          // Load scene JSON data via file system
          const scenePath = `${currentProject.path}/scenes/${currentSceneName}.json`;
          const sceneContent = await window.projectAPI.readFile(scenePath);
          const sceneData = JSON.parse(sceneContent);
          // Pass the actual JSON data to the service with filename tracking
          await gameWorldService.current!.loadSceneFromFile(sceneData, currentSceneName);
        }

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

  // Setup camera service updates in the render loop
  useEffect(() => {
    if (!gameWorldService.current) return;
    
    let animationId: number;
    
    const updateLoop = () => {
      if (gameWorldService.current) {
        gameWorldService.current.update();
      }
      animationId = requestAnimationFrame(updateLoop);
    };
    
    animationId = requestAnimationFrame(updateLoop);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameWorldService]);

  // Handle canvas resize using ResizeObserver for better accuracy
  useEffect(() => {
    if (!canvasRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (!gameWorldService.current) return;
      
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      
      if (width > 0 && height > 0) {
        // Update the Three.js renderer and cameras
        gameWorldService.current.resize(width, height);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvasRef.current);
    
    // Initial resize
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && gameWorldService.current) {
      gameWorldService.current.resize(rect.width, rect.height);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [gameWorldService]);

  return (
    <div className="absolute inset-0 pt-12">
      <div className="absolute inset-0"> {/* Account for left and right sidebars with margins */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
} 