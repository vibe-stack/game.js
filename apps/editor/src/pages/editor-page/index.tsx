import React, { useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { TopBar } from "./components/top-bar";
import { DevServerControls } from "./components/dev-server-controls";
import { SceneFrame } from "./components/scene-frame";
import { ScenePanel } from "./components/scene-panel";
import { useProjectStore } from "./stores/project-store";
import { useDevServerStore } from "./stores/dev-server-store";
import { useSceneStore } from "./stores/scene-store";

export default function EditorPage() {
  const search = useSearch({ from: "/editor" });
  const projectName = search.project || "Unknown Project";

  const { loadProjects, setCurrentProject, projects } = useProjectStore();
  const { checkServerStatus, isRunning } = useDevServerStore();
  const { setupEditorConnection } = useSceneStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const currentProject = projects.find((p) => p.name === projectName);
    setCurrentProject(currentProject || null);
  }, [projectName, projects, setCurrentProject]);

  useEffect(() => {
    checkServerStatus(projectName);
  }, [projectName, checkServerStatus]);

  // Set up editor connection when dev server is running
  useEffect(() => {
    if (isRunning) {
      setupEditorConnection(projectName);
    }
  }, [isRunning, projectName, setupEditorConnection]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar projectName={projectName} />
      
      <div className="flex-1 relative">
        <SceneFrame projectName={projectName} />
        <ScenePanel projectName={projectName} />
        
        <div className="absolute bottom-12 right-4">
          <DevServerControls projectName={projectName} />
        </div>
      </div>
    </div>
  );
}
