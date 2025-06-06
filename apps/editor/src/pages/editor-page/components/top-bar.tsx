import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FolderOpen,
  Settings, PackageIcon
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
  const { serverInfo, errorMessage, isInstalling, installPackages } = useDevServerStore();

  const handleOpenProjectFolder = () => {
    if (currentProject) {
      openProjectFolder(currentProject.path);
    }
  };

  const handleInstallPackages = () => {
    installPackages(projectName);
  };

  const goBackToHome = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4">
        <Button variant="ghost" size="sm" onClick={goBackToHome}>
          <ArrowLeft size={16} />
        </Button>

        <div className="flex-1">
          <h1 className="font-semibold">{projectName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {serverInfo?.port && (
            <Badge variant="secondary" className="gap-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Port {serverInfo.port}
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
            onClick={handleOpenProjectFolder}
            title="Open Project Folder"
          >
            <FolderOpen size={14} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleInstallPackages}
            disabled={isInstalling}
            title="Install Packages"
          >
            <PackageIcon size={14} />
          </Button>

          <Button variant="ghost" size="sm" title="Settings">
            <Settings size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
} 