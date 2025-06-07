import React, { useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { TopBar } from "./components/top-bar";
import { SceneFrame } from "./components/scene-frame";
import { useProjectStore } from "./stores/project-store";
import { useDevServerStore } from "./stores/dev-server-store";
import { useSceneStore } from "./stores/scene-store";
import { LeftPanel } from "./components/left-panel";
import { RightPanel } from "./components/right-panel";

export default function EditorPage() {
  const search = useSearch({ from: "/editor" });
  const projectName = search.project || "Unknown Project";

  const { loadProjects, setCurrentProject, projects } = useProjectStore();
  const { checkServerStatus } = useDevServerStore();
  const { initializeScene } = useSceneStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const currentProject = projects.find((p) => p.name === projectName);
    setCurrentProject(currentProject || null);
  }, [projectName, projects, setCurrentProject]);

  useEffect(() => {
    const initializeServerConnection = async () => {
      await checkServerStatus(projectName);
      
      const { isRunning: serverIsRunning } = useDevServerStore.getState();
      if (serverIsRunning) {
        setTimeout(async () => {
          await initializeScene(projectName);
        }, 1000);
      }
    };
    
    initializeServerConnection();
  }, [projectName, initializeScene]);

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      <TopBar projectName={projectName} />
      
      <div className="flex-1 relative">
        <SceneFrame projectName={projectName} />
        <LeftPanel projectName={projectName} />
        <RightPanel />
      </div>
    </div>
  );
}

