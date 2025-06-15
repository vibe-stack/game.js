import React from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";

type PhysicsState = 'stopped' | 'playing' | 'paused';

interface PhysicsControlsToolbarProps {
  physicsState: PhysicsState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;
}

export default function PhysicsControlsToolbar({
  physicsState,
  onPlay,
  onPause,
  onStop,
  onResume,
}: PhysicsControlsToolbarProps) {
  return (
    <div className="flex items-center space-x-1 px-2 py-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-sm">
      
      {physicsState === 'stopped' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlay}
          className="h-8 w-8 p-0"
          title="Play Physics Simulation"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}

      {physicsState === 'playing' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPause}
          className="h-8 w-8 p-0"
          title="Pause Physics Simulation"
        >
          <Pause className="h-4 w-4" />
        </Button>
      )}

      {physicsState === 'paused' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResume}
          className="h-8 w-8 p-0"
          title="Resume Physics Simulation"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        className="h-8 w-8 p-0"
        disabled={physicsState === 'stopped'}
        title="Stop Physics Simulation"
      >
        <Square className="h-4 w-4" />
      </Button>

      <div className={cn("mx-2 w-2 h-2 rounded-full", physicsState === 'stopped' ? 'bg-red-500' : physicsState === 'playing' ? 'bg-green-500' : 'bg-yellow-500')}>
      </div>
    </div>
  );
} 