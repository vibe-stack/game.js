import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  FolderOpen,
  ArrowLeft,
  Settings,
  Download,
  PackageIcon,
} from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";

export default function EditorPage() {
  const [isDevServerRunning, setIsDevServerRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [serverInfo, setServerInfo] = useState<DevServerInfo | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const search = useSearch({ from: "/editor" });

  const projectName = search.project || "Unknown Project";

  useEffect(() => {
    loadProjects();
    checkServerStatus();
  }, [projectName]);

  const loadProjects = async () => {
    try {
      const projectList = await window.projectAPI.loadProjects();
      setProjects(projectList);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const checkServerStatus = async () => {
    try {
      const isRunning = await window.projectAPI.isDevServerRunning(projectName);
      setIsDevServerRunning(isRunning);

      if (isRunning) {
        const info = await window.projectAPI.getServerInfo(projectName);
        setServerInfo(info);
      }
    } catch (error) {
      console.error("Failed to check server status:", error);
    }
  };

  const currentProject = projects.find((p) => p.name === projectName);

  const installPackages = async () => {
    setIsInstalling(true);
    setErrorMessage(null);
    try {
      await window.projectAPI.installPackages(projectName);
    } catch (error) {
      console.error("Failed to install packages:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to install packages",
      );
    } finally {
      setIsInstalling(false);
    }
  };

  const startDevServer = async () => {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const info = await window.projectAPI.startDevServer(projectName);
      setIsDevServerRunning(true);
      setServerInfo(info);
    } catch (error) {
      console.error("Failed to start dev server:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start dev server",
      );
      setIsDevServerRunning(false);
    } finally {
      setIsStarting(false);
    }
  };

  const stopDevServer = async () => {
    setErrorMessage(null);
    try {
      await window.projectAPI.stopDevServer(projectName);
      setIsDevServerRunning(false);
      setServerInfo(undefined);
    } catch (error) {
      console.error("Failed to stop dev server:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to stop dev server",
      );
    }
  };

  const openProjectFolder = () => {
    if (currentProject) {
      window.projectAPI
        .openProjectFolder(currentProject.path)
        .catch((error) =>
          console.error("Failed to open project folder:", error),
        );
    }
  };

  const goBackToHome = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Top Bar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" onClick={goBackToHome}>
            <ArrowLeft size={16} />
          </Button>

          <div className="flex-1">
            <h1 className="font-semibold">{projectName}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isDevServerRunning && (
              <Badge variant="secondary" className="gap-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                {serverInfo?.port && `Port ${serverInfo.port}`}
              </Badge>
            )}

            {errorMessage && (
              <Badge variant="destructive" className="max-w-xs truncate">
                {errorMessage}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={openProjectFolder}
              title="Open Project Folder"
            >
              <FolderOpen size={14} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={installPackages}
              disabled={isInstalling}
              title="Install Packages"
            >
              <PackageIcon size={14} />
            </Button>

            {isDevServerRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopDevServer}
                title="Stop Dev Server"
              >
                <Square size={14} />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={startDevServer}
                disabled={isStarting}
                title="Start Dev Server"
              >
                <Play size={14} />
              </Button>
            )}

            <Button variant="ghost" size="sm" title="Settings">
              <Settings size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="bg-muted/50 flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold">Game Editor</h2>
          <p className="text-muted-foreground mb-4">
            The visual editor for {projectName} will be implemented here
          </p>
          {!isDevServerRunning && (
            <p className="text-muted-foreground text-sm">
              Start the dev server to begin editing your game
            </p>
          )}
          {serverInfo?.url && (
            <p className="text-muted-foreground text-sm">
              Dev server running at{" "}
              <a
                href={serverInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {serverInfo.url}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
