import React from 'react';
import { LoadingProgress } from '../../models/scene-loader';
import { Progress } from './progress';
import { Badge } from './badge';
import { AlertCircle, Check, Clock } from 'lucide-react';

interface LoadingOverlayProps {
  progress: LoadingProgress;
  isVisible: boolean;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  progress,
  isVisible,
  onCancel,
}) => {
  if (!isVisible) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getPhaseIcon = (phase: LoadingProgress['phase']) => {
    switch (phase) {
      case 'analyzing':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'loading':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'applying':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPhaseLabel = (phase: LoadingProgress['phase']) => {
    switch (phase) {
      case 'analyzing':
        return 'Analyzing Scene';
      case 'loading':
        return 'Loading Assets';
      case 'applying':
        return 'Applying Assets';
      case 'complete':
        return 'Complete';
      default:
        return 'Loading';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Loading Scene
          </h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            {getPhaseIcon(progress.phase)}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getPhaseLabel(progress.phase)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {Math.round(progress.overallProgress)}%
              </span>
            </div>
            <Progress 
              value={progress.overallProgress} 
              className="h-2"
            />
          </div>

          {/* Asset Loading Progress */}
          {progress.phase === 'loading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Assets Loaded</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {progress.assetsLoaded} / {progress.totalAssets}
                </span>
              </div>
              <Progress 
                value={progress.totalAssets > 0 ? (progress.assetsLoaded / progress.totalAssets) * 100 : 0} 
                className="h-2"
              />
            </div>
          )}

          {/* Current Asset */}
          {progress.currentAsset && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Current Asset
              </div>
              <div className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded truncate">
                {progress.currentAsset}
              </div>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex gap-2 justify-center">
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(progress.loadingTimeMs)}
            </Badge>
            
            {progress.estimatedTimeRemainingMs > 0 && progress.phase !== 'complete' && (
              <Badge variant="outline">
                ~{formatTime(progress.estimatedTimeRemainingMs)} remaining
              </Badge>
            )}
          </div>

          {/* Phase-specific Information */}
          {progress.phase === 'analyzing' && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Analyzing scene structure and identifying assets...
            </div>
          )}

          {progress.phase === 'loading' && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Loading assets in parallel for optimal performance...
            </div>
          )}

          {progress.phase === 'applying' && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Applying loaded assets to scene entities...
            </div>
          )}

          {progress.phase === 'complete' && (
            <div className="text-center text-sm text-green-600 dark:text-green-400">
              Scene loaded successfully!
            </div>
          )}
        </div>

        {/* Cancel Button */}
        {onCancel && progress.phase !== 'complete' && (
          <div className="mt-6 text-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel Loading
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay; 