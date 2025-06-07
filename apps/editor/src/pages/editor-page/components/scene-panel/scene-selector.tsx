import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRight } from "lucide-react";
import { useSceneStore } from "../../stores/scene-store";

export function SceneSelector() {
  const { routes, currentRoute, setCurrentRoute, loadSceneObjects } = useSceneStore();

  const handleSceneSelect = (route: string, filePath: string) => {
    setCurrentRoute(route, filePath);
    loadSceneObjects(filePath);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Scenes</h3>
        <Badge variant="secondary" className="text-xs">
          {routes.length}
        </Badge>
      </div>
      
      <div className="space-y-1">
        {routes.map((route) => (
          <Button
            key={route.path}
            variant={currentRoute === route.path ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start h-auto p-2"
            onClick={() => handleSceneSelect(route.path, route.filePath)}
          >
            <FileText size={14} className="mr-2 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium text-xs">{route.name}</div>
              <div className="text-muted-foreground text-xs truncate">
                {route.path}
              </div>
            </div>
            {currentRoute === route.path && (
              <ChevronRight size={12} className="ml-1" />
            )}
          </Button>
        ))}
      </div>
      
      {routes.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted-foreground text-xs">No scenes found</p>
        </div>
      )}
    </div>
  );
} 