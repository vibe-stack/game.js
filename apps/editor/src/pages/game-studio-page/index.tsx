import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import useGameStudioStore from "@/stores/game-studio-store";
import { GameWorldService } from "./services/game-world-service";
import FloatingToolbar from "./components/floating-toolbar";
import GameCanvas from "./components/game-canvas";
import LoadingOverlay from "./components/loading-overlay";
import ErrorDisplay from "./components/error-display";
import SceneSidebar from "./components/scene-sidebar";
import PropertiesSidebar from "./components/properties-sidebar";
import { MaterialEditor } from "./components/material-editor";
import { CharacterControllerEditor } from "./components/properties-sidebar/inspector/character-controller-editor";
import ShaderEditor from "./components/shader-editor";
import CodeEditor from "@/components/code-editor";
import { toast } from "sonner";
import { Entity } from "@/models";

export default function GameStudioPage() {
  const navigate = useNavigate();
  const gameWorldServiceRef = useRef<GameWorldService | null>(null);
  // State for double-X key deletion
  const lastXKeyPressRef = useRef<number>(0);
  
  // Code editor state
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [editingScriptPath, setEditingScriptPath] = useState<string | null>(null);
  
  const { currentProject, selectedEntity, gameState } = useGameStudioStore();
  const { setSaving, error, playGame, pauseGame, resetGame, resumeGame, setSelectedEntity } = useGameStudioStore.getState();

  useEffect(() => {
    if (!currentProject) {
      navigate({ to: "/" });
    }
  }, [currentProject, navigate]);

  // Expose gameWorldService globally for debugging
  useEffect(() => {
    if (gameWorldServiceRef.current) {
      (window as any).gameWorldService = gameWorldServiceRef.current;
    }
    return () => {
      (window as any).gameWorldService = null;
    };
  }, [gameWorldServiceRef.current]);

  // Double-X key deletion feature
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle X key when not in playing mode and not in input fields
      if (
        event.key.toLowerCase() !== 'x' ||
        gameState === 'playing' ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Only proceed if there's a selected entity
      if (!selectedEntity || !gameWorldServiceRef.current) {
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastPress = currentTime - lastXKeyPressRef.current;
      
      if (timeSinceLastPress <= 1000) {
        // Double X press detected within 1 second - delete the entity
        event.preventDefault();
        
        // Get entity name before deletion for toast message
        const gameWorld = gameWorldServiceRef.current.getGameWorld();
        const entitiesRegistry = gameWorld?.getRegistryManager().getRegistry<Entity>("entities");
        const entity = entitiesRegistry?.get(selectedEntity);
        const entityName = entity?.entityName || "Entity";
        
        // Delete the entity using the service method
        const success = gameWorldServiceRef.current.deleteEntity(selectedEntity);
        
        if (success) {
        } else {
          toast.error("Failed to delete entity");
        }
        
        // Reset the timer to prevent triple-X from triggering again
        lastXKeyPressRef.current = 0;
      } else {
        // First X press or too much time has passed - record the time
        lastXKeyPressRef.current = currentTime;
        
        // Show a subtle hint for the first X press
        const gameWorld = gameWorldServiceRef.current.getGameWorld();
        const entitiesRegistry = gameWorld?.getRegistryManager().getRegistry<Entity>("entities");
        const entity = entitiesRegistry?.get(selectedEntity);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntity, gameState, setSelectedEntity]);

  const handleGoHome = () => {
    if (gameWorldServiceRef.current) {
      gameWorldServiceRef.current.dispose();
    }
    navigate({ to: "/" });
  };

  useEffect(() => {
    return () => {
      if (gameWorldServiceRef.current) {
        gameWorldServiceRef.current.dispose();
      }
    }
  }, []);

  const handleSave = async () => {
    if (!gameWorldServiceRef.current) return;
    const { currentScene } = useGameStudioStore.getState();
    
    setSaving(true);
    try {
      await gameWorldServiceRef.current.saveScene();
      // toast.success(`Scene "${currentScene?.name || 'Untitled'}" saved successfully`);
    } catch (error) {
      console.error("Failed to save scene:", error);
      toast.error(`Failed to save scene: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFolder = async () => {
    if (!currentProject) return;
    try {
      await window.projectAPI.openProjectFolder(currentProject.path);
    } catch (error) {
      console.error("Failed to open project folder:", error);
    }
  };
  
  const handlePlay = () => gameWorldServiceRef.current?.play();
  const handlePause = () => gameWorldServiceRef.current?.pause();
  const handleStop = () => gameWorldServiceRef.current?.reset(); // Stop now means reset
  const handleResume = () => gameWorldServiceRef.current?.resume();

  if (error) {
    return <ErrorDisplay onGoHome={handleGoHome} />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-gray-900">
      <LoadingOverlay />
      { gameState === "playing" ? null : <SceneSidebar gameWorldService={gameWorldServiceRef} />}
      { gameState === "playing" ? null : <PropertiesSidebar 
        gameWorldService={gameWorldServiceRef} 
        onOpenCodeEditor={(scriptPath: string) => {
          setEditingScriptPath(scriptPath);
          setCodeEditorOpen(true);
        }}
      />}
      <FloatingToolbar
        onHome={handleGoHome}
        onSave={handleSave}
        onOpenFolder={handleOpenFolder}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onResume={handleResume}
      />
      <GameCanvas gameWorldService={gameWorldServiceRef} />
      { gameState === "playing" ? null : <MaterialEditor />}
      { gameState === "playing" ? null : <CharacterControllerEditor />}
      { gameState === "playing" ? null : <ShaderEditor />}
      
      {/* Code Editor - rendered at page level */}
      <CodeEditor
        isOpen={codeEditorOpen}
        onClose={() => {
          setCodeEditorOpen(false);
          setEditingScriptPath(null);
        }}
        initialFile={editingScriptPath || undefined}
      />
    </div>
  );
}