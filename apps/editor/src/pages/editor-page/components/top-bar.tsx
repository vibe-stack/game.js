import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FolderOpen,
  Settings,
  PackageIcon,
  Play,
  Square
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useProjectStore } from "../stores/project-store";
import { useDevServerStore } from "../stores/dev-server-store";

interface TopBarProps {
  projectName: string;
}

export function TopBar({ projectName }: TopBarProps) {
  const navigate = useNavigate();
  const { currentProject, openProjectFolder } = useProjectStore();
  const { 
    serverInfo, 
    errorMessage, 
    isInstalling, 
    installPackages,
    isRunning,
    isStarting,
    startDevServer,
    stopDevServer
  } = useDevServerStore();

  const handleOpenProjectFolder = () => {
    if (currentProject) {
      openProjectFolder(currentProject.path);
    }
  };

  const handleInstallPackages = () => {
    installPackages(projectName);
  };

  const handleStartServer = () => {
    startDevServer(projectName);
  };

  const handleStopServer = () => {
    stopDevServer(projectName);
  };

  const goBackToHome = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border-b border-gray-800/50 h-16 flex items-center px-6 z-30 relative">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goBackToHome}
          className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="h-4 w-px bg-gray-700/50" />
        <h1 className="font-medium text-sm text-gray-200">{projectName}</h1>
      </div>

      {/* Center */}
      <div className="flex-1 flex justify-center">
        {isRunning ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopServer}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-2 px-4 py-1.5 h-8"
          >
            <Square size={14} fill="currentColor" />
            Stop
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartServer}
            disabled={isStarting}
            className="text-green-400 hover:text-green-300 hover:bg-green-900/20 gap-2 px-4 py-1.5 h-8"
          >
            <Play size={14} fill="currentColor" />
            {isStarting ? "Starting..." : "Play"}
          </Button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {serverInfo?.port && (
          <Badge variant="secondary" className="bg-gray-800/50 text-gray-300 border-gray-700/50 text-xs gap-1 px-2 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            :{serverInfo.port}
          </Badge>
        )}

        {errorMessage && (
          <Badge variant="destructive" className="max-w-xs truncate text-xs">
            {errorMessage}
          </Badge>
        )}

        <div className="h-4 w-px bg-gray-700/50" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenProjectFolder}
          title="Open Project Folder"
          className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
        >
          <FolderOpen size={14} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleInstallPackages}
          disabled={isInstalling}
          title="Install Packages"
          className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
        >
          <PackageIcon size={14} />
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          title="Settings" 
          className="text-gray-400 hover:text-white hover:bg-gray-800/50 h-8 w-8 p-0"
        >
          <Settings size={14} />
        </Button>
      </div>
    </div>
  );
} 