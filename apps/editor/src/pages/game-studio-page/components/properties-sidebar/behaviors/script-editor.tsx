import React, { useState, useEffect, useCallback } from "react";
import { ScriptManager } from "@/models";
import { ScriptLoaderService } from "@/services/script-loader-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  FileCode, 
  FolderOpen,
  Plus,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit2,
  Loader
} from "lucide-react";
import useGameStudioStore from "@/stores/game-studio-store";
import { toast } from "sonner";

interface ScriptEditorProps {
  scriptManager: ScriptManager;
  onScriptCreated: (scriptId: string) => void;
  onEditScript: (scriptPath: string) => void;
}

export function ScriptEditor({ scriptManager, onScriptCreated, onEditScript }: ScriptEditorProps) {
  const { currentProject } = useGameStudioStore();
  const scriptLoaderService = ScriptLoaderService.getInstance();
  
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");
  const [compilationStatus, setCompilationStatus] = useState<Record<string, 'success' | 'error' | 'compiling'>>({});
  const [scriptErrors, setScriptErrors] = useState<Record<string, string>>({});
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Poll for available script files
  const refreshScripts = useCallback(async () => {
    if (!currentProject) return;

    try {
      const status = await window.scriptAPI.getCompilationStatus(currentProject.path);
      const compiledScripts = await window.scriptAPI.getCompiledScripts(currentProject.path);
      
      const scriptPaths = Object.keys(compiledScripts);
      setAvailableScripts(scriptPaths);
      
      // Update compilation status
      const newStatus: Record<string, 'success' | 'error' | 'compiling'> = {};
      scriptPaths.forEach(path => {
        newStatus[path] = 'success'; // Default to success if compiled
      });
      setCompilationStatus(newStatus);
    } catch (error) {
      console.error('Failed to get script files:', error);
    }
  }, [currentProject]);

  useEffect(() => {
    refreshScripts();
    const interval = setInterval(refreshScripts, 2000);
    
    return () => clearInterval(interval);
  }, [refreshScripts, refreshCounter]);

  const handleCreateScript = async () => {
    if (!currentProject || !newScriptName.trim()) {
      toast.error("Please enter a script name");
      return;
    }

    const scriptPath = `${newScriptName.replace(/\.ts$/, '')}.ts`;
    
    // Create script file content with template
    const scriptContent = `// ${newScriptName}
// Oscillating movement script
export const parameters = [
  {
    name: 'speedMove',
    type: 'number' as const,
    defaultValue: 4,
    min: 0,
    max: 10,
    step: 0.1,
    description: 'Oscillation speed'
  },
  {
    name: 'axis',
    type: 'string' as const,
    defaultValue: 'x',
    options: ['x', 'y', 'z'],
    description: 'Axis to oscillate on'
  },
  {
    name: 'maxDistance',
    type: 'number' as const,
    defaultValue: 5,
    min: 0.1,
    max: 20,
    step: 0.1,
    description: 'Maximum distance from starting position'
  }
];

let startPosition: any = null;
let time = 0;

export function init(context: any): void {
  console.log('Oscillate script initialized on', context.entity.entityName);
  console.log('Initial parameters:', context.parameters);
  // Store the initial position as the center point
  startPosition = {
    x: context.entity.position.x,
    y: context.entity.position.y,
    z: context.entity.position.z
  };
  time = 0;
}

export function update(context: any, deltaTime: number): void {
  // Get parameters
  const speed = context.parameters.speed || 2;
  const axis = context.parameters.axis || 'x';
  const maxDistance = context.parameters.maxDistance || 5;
  
  // Update time
  time += deltaTime * speed;
  
  // Calculate oscillation offset using sine wave
  const offset = Math.sin(time) * maxDistance;
  
  // Apply oscillation to the specified axis
  const position = context.entity.position;
  position.x = startPosition.x;
  position.y = startPosition.y;
  position.z = startPosition.z;
  
  switch (axis) {
    case 'x':
      position.x = startPosition.x + offset;
      break;
    case 'y':
      position.y = startPosition.y + offset;
      break;
    case 'z':
      position.z = startPosition.z + offset;
      break;
  }
}

export function destroy(context: any): void {
  // Reset to original position
  if (startPosition) {
    context.entity.position.x = startPosition.x;
    context.entity.position.y = startPosition.y;
    context.entity.position.z = startPosition.z;
  }
} 
`;

    try {
      // Save the script file
      await window.projectAPI.saveScriptFile(currentProject.path, scriptPath, scriptContent);
      
      toast.success(`Created script: ${scriptPath}`);
      setNewScriptName("");
      setIsCreatingNew(false);
      
      // Force refresh to pick up new script
      setRefreshCounter(prev => prev + 1);
      
      // Wait a bit then check if script is available
      setTimeout(async () => {
        await refreshScripts();
        const scriptId = scriptLoaderService.getScriptIdFromPath(currentProject.path, scriptPath);
        
        // Try to attach if available
        if (scriptManager.getScript(scriptId)) {
          onScriptCreated(scriptId);
        } else {
          // Try to manually reload the script
          try {
            await scriptLoaderService.reloadScript(currentProject.path, scriptPath);
            if (scriptManager.getScript(scriptId)) {
              onScriptCreated(scriptId);
            }
          } catch (error) {
            console.error('Failed to reload new script:', error);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to create script:', error);
      toast.error(`Failed to create script: ${error}`);
    }
  };

  const handleEditScript = async (scriptPath: string) => {
    // Pass the relative script path - the parent component will handle full path construction
    onEditScript(scriptPath);
  };

  const handleRecompileScript = async (scriptPath: string) => {
    if (!currentProject) return;
    
    setCompilationStatus(prev => ({ ...prev, [scriptPath]: 'compiling' }));
    
    try {
      const result = await window.scriptAPI.compileScript(currentProject.path, scriptPath);
      
      if (result.success) {
        setCompilationStatus(prev => ({ ...prev, [scriptPath]: 'success' }));
        setScriptErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[scriptPath];
          return newErrors;
        });
        
        // Reload the script in the manager
        await scriptLoaderService.reloadScript(currentProject.path, scriptPath);
        
        toast.success(`Recompiled ${scriptPath}`);
      } else {
        setCompilationStatus(prev => ({ ...prev, [scriptPath]: 'error' }));
        setScriptErrors(prev => ({ ...prev, [scriptPath]: result.error || 'Unknown error' }));
        toast.error(`Compilation failed: ${result.error}`);
      }
    } catch (error) {
      setCompilationStatus(prev => ({ ...prev, [scriptPath]: 'error' }));
      toast.error(`Failed to recompile: ${error}`);
    }
  };

  const getScriptName = (scriptPath: string) => {
    return scriptLoaderService.getScriptNameFromPath(scriptPath);
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
        <AlertCircle className="h-6 w-6 mb-2 opacity-50" />
        <p className="text-sm">No project loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create New Script */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Create New Script</h5>
        {isCreatingNew ? (
          <div className="space-y-2">
            <Input
              placeholder="script-name.ts"
              value={newScriptName}
              onChange={(e) => setNewScriptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateScript()}
              className="h-7 bg-gray-900/50 border-gray-800 text-gray-200 text-xs placeholder:text-gray-600"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleCreateScript}
                className="flex-1 h-7 bg-green-600/20 text-green-400 hover:bg-green-600/30 border-0"
              >
                <Save className="h-3 w-3 mr-1" />
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewScriptName("");
                }}
                className="h-7 text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setIsCreatingNew(true)}
            className="w-full h-7 bg-gray-800 text-gray-200 hover:bg-gray-700 border-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Script
          </Button>
        )}
      </div>

      {/* Existing Scripts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Project Scripts</h5>
          <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-500 border-0">
            {availableScripts.length}
          </Badge>
        </div>

        <ScrollArea className="h-64">
          {availableScripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <FileCode className="h-6 w-6 mb-2 opacity-50" />
              <p className="text-sm">No scripts found</p>
              <p className="text-xs opacity-60">Create your first script above</p>
            </div>
          ) : (
            <div className="space-y-1">
              {availableScripts.map((scriptPath) => (
                <ScriptFileCard
                  key={scriptPath}
                  scriptPath={scriptPath}
                  scriptName={getScriptName(scriptPath)}
                  status={compilationStatus[scriptPath]}
                  error={scriptErrors[scriptPath]}
                  onEdit={() => handleEditScript(scriptPath)}
                  onRecompile={() => handleRecompileScript(scriptPath)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

interface ScriptFileCardProps {
  scriptPath: string;
  scriptName: string;
  status?: 'success' | 'error' | 'compiling';
  error?: string;
  onEdit: () => void;
  onRecompile: () => void;
}

function ScriptFileCard({ 
  scriptPath, 
  scriptName, 
  status = 'success',
  error,
  onEdit, 
  onRecompile 
}: ScriptFileCardProps) {
  return (
    <div className="group bg-gray-900/50 hover:bg-gray-800/50 rounded p-2 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <FileCode className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">
              {scriptName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {scriptPath}
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-1 line-clamp-2">
                {error}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {status === 'compiling' && (
            <Loader className="h-3 w-3 animate-spin text-yellow-400" />
          )}
          {status === 'success' && (
            <CheckCircle className="h-3 w-3 text-green-400" />
          )}
          {status === 'error' && (
            <AlertCircle className="h-3 w-3 text-red-400" />
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRecompile}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
} 