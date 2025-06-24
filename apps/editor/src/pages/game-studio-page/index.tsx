import React, { useEffect, useRef } from "react";
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
import { toast } from "sonner";

export default function GameStudioPage() {
  const navigate = useNavigate();
  const gameWorldServiceRef = useRef<GameWorldService | null>(null);
  
  const { currentProject } = useGameStudioStore();
  const { setSaving, error, playGame, pauseGame, resetGame, resumeGame, gameState  } = useGameStudioStore.getState();

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
      { gameState === "playing" ? null : <PropertiesSidebar gameWorldService={gameWorldServiceRef} />}
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
    </div>
  );
}