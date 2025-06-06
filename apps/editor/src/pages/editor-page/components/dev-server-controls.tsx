import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { useDevServerStore } from "../stores/dev-server-store";

interface DevServerControlsProps {
  projectName: string;
}

export function DevServerControls({ projectName }: DevServerControlsProps) {
  const { 
    isRunning, 
    isStarting, 
    startDevServer, 
    stopDevServer 
  } = useDevServerStore();

  const handleStart = () => {
    startDevServer(projectName);
  };

  const handleStop = () => {
    stopDevServer(projectName);
  };

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleStop}
          title="Stop Dev Server"
        >
          <Square size={14} />
          Stop Server
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={handleStart}
          disabled={isStarting}
          title="Start Dev Server"
        >
          <Play size={14} />
          {isStarting ? "Starting..." : "Start Server"}
        </Button>
      )}
    </div>
  );
} 