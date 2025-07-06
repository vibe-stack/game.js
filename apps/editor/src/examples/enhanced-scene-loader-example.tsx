import React, { useState, useCallback } from 'react';
import { GameWorld } from '../models/game-world';
import { 
  EnhancedSceneLoader, 
  LoadingProgress, 
  EnhancedSceneLoaderOptions,
  SceneData 
} from '../models/scene-loader';
import { LoadingOverlay } from '../components/ui/loading-overlay';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

interface EnhancedSceneLoaderExampleProps {
  gameWorld: GameWorld;
  sceneData: SceneData;
  projectPath: string;
}

export const EnhancedSceneLoaderExample: React.FC<EnhancedSceneLoaderExampleProps> = ({
  gameWorld,
  sceneData,
  projectPath,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    phase: 'analyzing',
    overallProgress: 0,
    assetsLoaded: 0,
    totalAssets: 0,
    loadingTimeMs: 0,
    estimatedTimeRemainingMs: 0,
  });
  const [loadingStats, setLoadingStats] = useState<{
    totalAssets: number;
    failedAssets: number;
    totalLoadTime: number;
    success: boolean;
  } | null>(null);

  const [sceneLoader] = useState(() => new EnhancedSceneLoader());

  const handleLoadScene = useCallback(async () => {
    setIsLoading(true);
    setLoadingStats(null);
    
    const startTime = Date.now();

    // Configure loading options
    const options: EnhancedSceneLoaderOptions = {
      maxConcurrentLoads: 8,
      enableProgressiveLoading: true,
      enablePlaceholders: true,
      prioritizeVisibleAssets: true,
      timeoutMs: 30000,
      enableAssetPipeline: true,
      enableBackgroundLoading: true,
      showLoadingProgress: true,
    };

    try {
      // Setup progress callback
      sceneLoader.onProgress((progress) => {
        setLoadingProgress(progress);
      });

      // Setup completion callback
      sceneLoader.onComplete((success, error) => {
        const totalTime = Date.now() - startTime;
        const loadedAssets = sceneLoader.getLoadedAssets();
        const failedAssets = sceneLoader.getFailedAssets();
        
        setLoadingStats({
          totalAssets: loadedAssets.size + failedAssets.size,
          failedAssets: failedAssets.size,
          totalLoadTime: totalTime,
          success,
        });
        
        if (error) {
          console.error('Scene loading failed:', error);
        }
        
        setIsLoading(false);
      });

      // Load the scene
      await sceneLoader.loadScene(gameWorld, sceneData, options);
      
    } catch (error) {
      console.error('Scene loading error:', error);
      setIsLoading(false);
    }
  }, [gameWorld, sceneData, sceneLoader]);

  const handleCancelLoading = useCallback(() => {
    sceneLoader.cancelLoading();
    setIsLoading(false);
  }, [sceneLoader]);

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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Enhanced Scene Loader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            This example demonstrates the enhanced scene loader with parallel asset loading,
            progressive loading, and detailed progress feedback.
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={handleLoadScene} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Load Scene
                </>
              )}
            </Button>

            {isLoading && (
              <Button 
                onClick={handleCancelLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Cancel
              </Button>
            )}
          </div>

          {/* Loading Progress Display */}
          {isLoading && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {loadingProgress.phase === 'analyzing' && 'Analyzing Scene'}
                  {loadingProgress.phase === 'loading' && 'Loading Assets'}
                  {loadingProgress.phase === 'applying' && 'Applying Assets'}
                  {loadingProgress.phase === 'complete' && 'Complete'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(loadingProgress.overallProgress)}%</span>
                </div>
                <Progress value={loadingProgress.overallProgress} className="h-2" />
              </div>

              {loadingProgress.phase === 'loading' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Assets Loaded</span>
                    <span>{loadingProgress.assetsLoaded} / {loadingProgress.totalAssets}</span>
                  </div>
                  <Progress 
                    value={loadingProgress.totalAssets > 0 ? (loadingProgress.assetsLoaded / loadingProgress.totalAssets) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(loadingProgress.loadingTimeMs)}
                </Badge>
                
                {loadingProgress.estimatedTimeRemainingMs > 0 && loadingProgress.phase !== 'complete' && (
                  <Badge variant="outline">
                    ~{formatTime(loadingProgress.estimatedTimeRemainingMs)} remaining
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Loading Stats */}
          {loadingStats && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                {loadingStats.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {loadingStats.success ? 'Scene Loaded Successfully' : 'Scene Loading Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Total Assets</div>
                  <div className="font-medium">{loadingStats.totalAssets}</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Failed Assets</div>
                  <div className="font-medium text-red-500">{loadingStats.failedAssets}</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Load Time</div>
                  <div className="font-medium">{formatTime(loadingStats.totalLoadTime)}</div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Success Rate</div>
                  <div className="font-medium text-green-500">
                    {loadingStats.totalAssets > 0 
                      ? Math.round(((loadingStats.totalAssets - loadingStats.failedAssets) / loadingStats.totalAssets) * 100)
                      : 0
                    }%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Scene Loader Features */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium">Parallel Asset Loading</div>
              <div className="text-gray-600 dark:text-gray-400">
                Load multiple assets simultaneously instead of sequentially
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Progressive Loading</div>
              <div className="text-gray-600 dark:text-gray-400">
                Apply assets to the scene as soon as they're loaded
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Asset Pipeline Integration</div>
              <div className="text-gray-600 dark:text-gray-400">
                Automatic asset optimization and streaming
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Background Loading</div>
              <div className="text-gray-600 dark:text-gray-400">
                Use web workers to prevent blocking the main thread
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Placeholder Assets</div>
              <div className="text-gray-600 dark:text-gray-400">
                Show placeholder assets while loading for better UX
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Detailed Progress</div>
              <div className="text-gray-600 dark:text-gray-400">
                Real-time loading progress with time estimates
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      <LoadingOverlay
        progress={loadingProgress}
        isVisible={isLoading}
        onCancel={handleCancelLoading}
      />
    </div>
  );
};

export default EnhancedSceneLoaderExample; 