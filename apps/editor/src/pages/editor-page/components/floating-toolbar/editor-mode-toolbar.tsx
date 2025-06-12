import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Move3D, RotateCcw, MousePointerIcon,
  Rotate3d,
  Scale3d,
  Camera,
  ChevronDown,
  Navigation,
  MousePointer2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useEditorStore from "@/stores/editor-store";

export default function EditorModeToolbar() {
  const { editorMode, setEditorMode, currentScene, viewportMode, setViewportMode, physicsState } = useEditorStore();
  const [cameras, setCameras] = useState<GameObject[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Update cameras when scene changes
  useEffect(() => {
    if (currentScene) {
      // Find all camera objects in the scene
      const findCameras = (objects: GameObject[]): GameObject[] => {
        const cameras: GameObject[] = [];
        
        for (const obj of objects) {
          // Check if object has a camera component
          const hasCameraComponent = obj.components.some(
            comp => comp.type === 'PerspectiveCamera' || comp.type === 'OrthographicCamera'
          );
          
          if (hasCameraComponent) {
            cameras.push(obj);
          }
          
          // Recursively search children
          cameras.push(...findCameras(obj.children));
        }
        
        return cameras;
      };
      
      const sceneCameras = findCameras(currentScene.objects);
      setCameras(sceneCameras);
    } else {
      setCameras([]);
    }
  }, [currentScene]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input field is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'q':
          event.preventDefault();
          setEditorMode('select');
          break;
        case 'w':
          event.preventDefault();
          setEditorMode('move');
          break;
        case 'e':
          event.preventDefault();
          setEditorMode('rotate');
          break;
        case 'r':
          event.preventDefault();
          setEditorMode('scale');
          break;
        case 'v':
          event.preventDefault();
          setViewportMode(viewportMode === 'orbit' ? 'camera' : 'orbit');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setEditorMode, viewportMode, setViewportMode]);

  const handleUndo = () => {
    // TODO: Implement undo functionality
    console.log("Undo action triggered");
  };

  const handleCameraSelect = async (cameraId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (currentScene && currentScene.activeCamera !== cameraId) {
      setIsTransitioning(true);
      
      // Update the scene's active camera
      const { setCurrentScene } = useEditorStore.getState();
      setCurrentScene({
        ...currentScene,
        activeCamera: cameraId
      });
      
      // If switching to camera mode and selecting a camera, enable camera follow mode
      if (viewportMode === 'orbit') {
        setViewportMode('camera');
      }
      
      // Simulate transition duration for smooth UX
      setTimeout(() => {
        setIsTransitioning(false);
      }, 800);
    }
  };

  const handleViewportModeToggle = () => {
    const newMode = viewportMode === 'orbit' ? 'camera' : 'orbit';
    setViewportMode(newMode);
    
    // If switching to camera mode but no camera is selected, select the first available or default
    if (newMode === 'camera' && (!currentScene?.activeCamera || cameras.length === 0)) {
      const defaultCamera = getDefaultCamera() || cameras[0];
      if (defaultCamera && currentScene) {
        const { setCurrentScene } = useEditorStore.getState();
        setCurrentScene({
          ...currentScene,
          activeCamera: defaultCamera.id
        });
      }
    }
  };

  const getCurrentCameraName = () => {
    if (!currentScene?.activeCamera || cameras.length === 0) {
      return "Editor Camera";
    }
    
    const activeCamera = cameras.find(cam => cam.id === currentScene.activeCamera);
    return activeCamera?.name || "Unknown Camera";
  };

  const getDefaultCamera = () => {
    return cameras.find(camera => {
      const cameraComponent = camera.components.find(
        comp => comp.type === 'PerspectiveCamera' || comp.type === 'OrthographicCamera'
      );
      return (cameraComponent?.properties as any)?.isMain === true;
    });
  };

  const getCameraType = (camera: GameObject) => {
    const cameraComponent = camera.components.find(
      comp => comp.type === 'PerspectiveCamera' || comp.type === 'OrthographicCamera'
    );
    return cameraComponent?.type === 'PerspectiveCamera' ? 'Perspective' : 'Orthographic';
  };

  return (
   <div className="flex items-center gap-2">
    <div className="flex items-center gap-1 p-1 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 px-2 gap-1 transition-all duration-300 ${
              isTransitioning ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
            }`}
            title="Switch Camera"
            disabled={isTransitioning}
          >
            <Camera size={16} />
            <span className="text-xs max-w-20 truncate">
              {getCurrentCameraName()}
            </span>
            <ChevronDown size={12} className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 animate-in slide-in-from-top-2 duration-200">
          <DropdownMenuLabel>Scene Cameras</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {cameras.length > 0 ? (
            cameras.map((camera) => {
              const isActive = currentScene?.activeCamera === camera.id;
              const isDefault = getDefaultCamera()?.id === camera.id;
              
              return (
                <DropdownMenuItem
                  key={camera.id}
                  onClick={(e) => handleCameraSelect(camera.id, e)}
                  className="flex items-center justify-between hover:bg-accent/60 transition-colors duration-150"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{camera.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getCameraType(camera)}
                      {isDefault && " • Default"}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </DropdownMenuItem>
              );
            })
          ) : (
            <DropdownMenuItem disabled>
              No cameras in scene
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button
        size="sm"
        variant={viewportMode === 'camera' ? 'default' : 'ghost'}
        onClick={handleViewportModeToggle}
        className="h-8 w-8 p-0"
        title={`${viewportMode === 'orbit' ? 'Camera Follow' : 'Scene View'} Mode (V)`}
      >
        {viewportMode === 'orbit' ? <Navigation size={16} /> : <MousePointer2 size={16} />}
      </Button>
    </div>
    <div 
      className={`flex items-center gap-1 p-1 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg transition-all duration-300 ease-in-out ${
        physicsState === 'playing' 
          ? 'opacity-0 scale-95 pointer-events-none' 
          : 'opacity-100 scale-100'
      }`}
    >
      <Button
        size="sm"
        variant={editorMode === "select" ? "default" : "ghost"}
        onClick={() => setEditorMode("select")}
        className="h-8 w-8 p-0"
        title="Select Mode (Q)"
      >
        <MousePointerIcon size={16} />
      </Button>
      <Button
        size="sm"
        variant={editorMode === "move" ? "default" : "ghost"}
        onClick={() => setEditorMode("move")}
        className="h-8 w-8 p-0"
        title="Move Mode (W)"
      >
        <Move3D size={16} />
      </Button>
      <Button
        size="sm"
        variant={editorMode === "rotate" ? "default" : "ghost"}
        onClick={() => setEditorMode("rotate")}
        className="h-8 w-8 p-0"
        title="Rotate Mode (E)"
      >
        <Rotate3d size={16} />
      </Button>
      <Button
        size="sm"
        variant={editorMode === "scale" ? "default" : "ghost"}
        onClick={() => setEditorMode("scale")}
        className="h-8 w-8 p-0"
        title="Scale Mode (R)"
      >
        <Scale3d size={16} />
      </Button>
      <div className="bg-border h-4 w-px mx-1" />
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 w-8 p-0"
        onClick={handleUndo}
        title="Undo (Ctrl+Z)"
      >
        <RotateCcw size={16} />
      </Button>
    </div>
   </div>
  );
} 