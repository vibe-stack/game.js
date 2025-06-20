import React, { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import useEditorStore from "@/stores/editor-store";
import useGameStudioStore from "@/stores/game-studio-store";
import { GameWorldService } from "./services/game-world-service";
import FloatingToolbar from "./components/floating-toolbar";
import GameCanvas from "./components/game-canvas";
import LoadingOverlay from "./components/loading-overlay";
import ErrorDisplay from "./components/error-display";

export default function GameStudioPage() {
  const navigate = useNavigate();
  const gameWorldServiceRef = useRef<GameWorldService | null>(null);
  
  // Get current project from editor store
  const { currentProject } = useEditorStore();
  
  // Game Studio specific state
  const { 
    setCurrentProject,
    setSaving,
    error,
    // Physics control methods from store
    playGame,
    pauseGame,
    resetGame,
    resumeGame,
    gameState,
  } = useGameStudioStore();

  useEffect(() => {
    if (!currentProject) {
      navigate({ to: "/" });
      return;
    }

    // Set the current project in the game studio store
    setCurrentProject(currentProject as any);
  }, [currentProject, navigate, setCurrentProject]);

  const handleGoHome = () => {
    if (gameWorldServiceRef.current) {
      gameWorldServiceRef.current.stop();
      gameWorldServiceRef.current.dispose();
    }
    navigate({ to: "/" });
  };

  const handleSave = async () => {
    if (!gameWorldServiceRef.current) return;

    setSaving(true);
    try {
      await gameWorldServiceRef.current.saveScene();
    } catch (error) {
      console.error("Failed to save scene:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFolder = async () => {
    if (!currentProject) return;
    try {
      // TODO: Implement folder opening when project API is available
      console.log("Opening project folder - placeholder");
    } catch (error) {
      console.error("Failed to open project folder:", error);
    }
  };

  // Remove this function - it will be handled by the store now

  // Physics control handlers that work with both service and store
  const handlePlay = () => {
    if (gameWorldServiceRef.current) {
      playGame(); // This will call gameWorld.start() and set state
    }
  };

  const handlePause = () => {
    if (gameWorldServiceRef.current) {
      pauseGame(); // This will call gameWorld.pause() and set state
    }
  };

  const handleStop = () => {
    if (gameWorldServiceRef.current) {
      resetGame(); // This will call gameWorld.stop() and restore physics state
    }
  };

  const handleResume = () => {
    if (gameWorldServiceRef.current) {
      resumeGame(); // This will call gameWorld.resume() and set state
    }
  };

  // Show error display if there's an error
  if (error) {
    return <ErrorDisplay onGoHome={handleGoHome} />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-gray-900">
      {/* Loading Overlay */}
      <LoadingOverlay />

      {/* Floating Toolbar */}
      <FloatingToolbar
        onHome={handleGoHome}
        onSave={handleSave}
        onOpenFolder={handleOpenFolder}
        // Pass physics controls
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onResume={handleResume}
      />

      {/* Game Canvas */}
      <GameCanvas gameWorldService={gameWorldServiceRef} />
    </div>
  );
}
