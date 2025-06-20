import React from "react";
import useGameStudioStore from "@/stores/game-studio-store";

export default function LoadingOverlay() {
  const { isLoading, currentProject } = useGameStudioStore();

  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-30 bg-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
        <h1 className="mb-4 text-2xl font-bold">Loading...</h1>
        <p className="text-gray-400">
          Initializing &ldquo;{currentProject?.name}&rdquo;
        </p>
      </div>
    </div>
  );
} 