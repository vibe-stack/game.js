import React from "react";
import useGameStudioStore from "@/stores/game-studio-store";
import { LoadingOverlay as EnhancedLoadingOverlay } from "@/components/ui/loading-overlay";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Clock, Database } from "lucide-react";

export default function LoadingOverlay() {
  const { isLoading, currentProject, loadingProgress } = useGameStudioStore();

  // If we have detailed loading progress, use the enhanced overlay
  if (loadingProgress) {
    return (
      <EnhancedLoadingOverlay
        progress={loadingProgress}
        isVisible={true}
        onCancel={() => {
          // Optional: Add cancel functionality here
          console.log('Loading cancelled by user');
        }}
      />
    );
  }

  // Fallback to simple loading for initialization
  if (!isLoading) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Initializing Game Engine
          </h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Setting up &ldquo;{currentProject?.name}&rdquo;
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Indeterminate progress for initialization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Initializing...</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Preparing WebGPU renderer, physics engine, and asset systems...
          </div>
        </div>
      </div>
    </div>
  );
} 