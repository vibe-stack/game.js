import React from "react";
import { Button } from "@/components/ui/button";
import useGameStudioStore from "@/stores/game-studio-store";

interface ErrorDisplayProps {
  onGoHome: () => void;
}

export default function ErrorDisplay({ onGoHome }: ErrorDisplayProps) {
  const { error } = useGameStudioStore();

  if (!error) return null;

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">Error</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={onGoHome}>Go Home</Button>
      </div>
    </div>
  );
} 