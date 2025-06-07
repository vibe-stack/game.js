import React from "react";
import { Button } from "../../../../components/ui/button";
import { FileText, ChevronRight } from "lucide-react";
import { useSceneStore } from "../../stores/scene-store";
import { SceneRoute } from "../../types";

export function ScenesPanel() {
  const { routes, currentRoute, setCurrentRoute, loadSceneObjects, loadSceneRoutes } = useSceneStore();

  React.useEffect(() => {
    // Assuming project name is available somehow, or the store handles it.
    // For now, let's just trigger a load.
    loadSceneRoutes('test'); // HACK: Using a hardcoded project name
  }, [loadSceneRoutes]);

  const handleSceneSelect = (route: string, filePath: string) => {
    setCurrentRoute(route, filePath);
    loadSceneObjects(filePath);
  };

  return (
    <div className="space-y-1">
      {routes.map((route: SceneRoute) => (
        <Button
          key={route.path}
          variant="ghost"
          size="sm"
          className={`w-full justify-start h-auto p-2 text-left rounded-lg transition-all ${
            currentRoute === route.path 
              ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30' 
              : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
          }`}
          onClick={() => handleSceneSelect(route.path, route.filePath)}
        >
          <FileText size={16} className="mr-3 flex-shrink-0 self-center ml-1" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{route.name}</div>
          </div>
          {currentRoute === route.path && (
            <ChevronRight size={14} className="ml-2 flex-shrink-0" />
          )}
        </Button>
      ))}
      
      {routes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No scenes found</p>
          <p className="text-gray-600 text-xs mt-1">Create a scene to get started</p>
        </div>
      )}
    </div>
  );
} 