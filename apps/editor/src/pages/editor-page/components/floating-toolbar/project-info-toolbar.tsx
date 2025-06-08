import React from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

interface ProjectInfoToolbarProps {
  projectName?: string;
  sceneName?: string;
  onHome: () => void;
}

export default function ProjectInfoToolbar({
  projectName,
  sceneName,
  onHome,
}: ProjectInfoToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <Button
        size="sm"
        variant="outline"
        onClick={onHome}
        className="gap-2 h-8"
      >
        <Home size={16} />
      </Button>
      <div className="bg-border h-4 w-px" />
      <div className="flex items-center gap-2">
        <span className="font-medium text-xs">{projectName}</span>
        <span className="text-muted-foreground text-xs">
          {sceneName || "No Scene"}
        </span>
      </div>
    </div>
  );
} 