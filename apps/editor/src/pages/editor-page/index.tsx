import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import useEditorStore from "@/stores/editor-store";
import Viewport from "./components/viewport";
import LeftPanel from "./components/left-panel";
import RightPanel from "./components/right-panel";
import FloatingToolbar from "./components/floating-toolbar";

export default function EditorPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    currentProject,
    currentScene,
    selectedObjects,
    editorMode,
    setCurrentScene,
    setEditorMode,
    selectObject,
  } = useEditorStore();

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    if (!currentProject) {
      navigate({ to: "/" });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sceneName = currentProject.currentScene || currentProject.scenes[0];
      if (sceneName) {
        const scene = await window.projectAPI.loadScene(
          currentProject.path,
          sceneName,
        );
        setCurrentScene(scene);
      }
    } catch (error) {
      setError(
        `Failed to load project: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveScene = async () => {
    if (!currentProject || !currentScene) return;

    setIsSaving(true);
    try {
      await window.projectAPI.saveScene(currentProject.path, currentScene);
    } catch (error) {
      console.error("Failed to save scene:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const goHome = () => {
    navigate({ to: "/" });
  };

  const openProjectFolder = async () => {
    if (!currentProject) return;
    try {
      await window.projectAPI.openProjectFolder(currentProject.path);
    } catch (error) {
      console.error("Failed to open project folder:", error);
    }
  };

  const handleObjectSelect = (objectId: string) => {
    selectObject(objectId);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Loading Project...</h1>
          <p className="text-muted-foreground">
            Please wait while we load &ldquo;{currentProject?.name}&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={goHome}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Full-width Viewport */}
      <Viewport
        scene={currentScene}
        selectedObjects={selectedObjects}
        onSelectObject={handleObjectSelect}
      />

      {/* Floating Toolbar */}
      <FloatingToolbar
        projectName={currentProject?.name}
        sceneName={currentScene?.name}
        isSaving={isSaving}
        editorMode={editorMode}
        onSave={saveScene}
        onHome={goHome}
        onOpenFolder={openProjectFolder}
        onSetEditorMode={setEditorMode}
      />

      {/* Floating Left Panel */}
      <LeftPanel
        scene={currentScene}
        selectedObjects={selectedObjects}
        onSelectObject={handleObjectSelect}
      />

      {/* Floating Right Panel */}
      <RightPanel
        scene={currentScene}
        selectedObjects={selectedObjects}
      />
    </div>
  );
}
