import React, { useState, useEffect, useCallback } from "react";
import { ScriptManager } from "@/models";
import { ScriptLoaderService } from "@/services/script-loader-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileCode, 
  FolderOpen,
  Plus,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit,
  FileText,
  Loader
} from "lucide-react";
import useGameStudioStore from "@/stores/game-studio-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ScriptEditorProps {
  scriptManager: ScriptManager;
  onScriptCreated: (scriptId: string) => void;
}

export function ScriptEditor({ scriptManager, onScriptCreated }: ScriptEditorProps) {
  const { currentProject } = useGameStudioStore();
  const scriptLoaderService = ScriptLoaderService.getInstance();
  
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");
  const [compilationStatus, setCompilationStatus] = useState<Record<string, 'success' | 'error' | 'compiling'>>({});
  const [scriptErrors, setScriptErrors] = useState<Record<string, string>>({});
  
  // Poll for available script files
  useEffect(() => {
    if (!currentProject) return;

    const checkScripts = async () => {
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
    };

    checkScripts();
    const interval = setInterval(checkScripts, 2000);
    
    return () => clearInterval(interval);
  }, [currentProject]);

  const handleCreateScript = async () => {
    if (!currentProject || !newScriptName.trim()) {
      toast.error("Please enter a script name");
      return;
    }

    const scriptPath = `${newScriptName.replace(/\.ts$/, '')}.ts`;
    
    // Create script file content with template
    const scriptContent = `// ${newScriptName}
// This script runs on entities in the game

import * as THREE from 'three';

// Optional: Export parameters that can be configured in the editor
export const parameters = [
  {
    name: 'speed',
    type: 'number' as const,
    defaultValue: 1,
    min: 0,
    max: 10,
    step: 0.1,
    description: 'Movement speed'
  }
];

// Called once when the script is attached to an entity
export function init(context) {
  console.log('Script initialized on', context.entity.entityName);
}

// Called every frame
export function update(context, deltaTime) {
  // Example: Rotate the entity
  const rotation = context.entity.getRotation();
  rotation.y += deltaTime * (context.entity.getScriptParameters(context.entity.entityId, '${scriptPath.replace(/\.ts$/, '')}')?.speed || 1);
  context.entity.setRotation(rotation);
}

// Optional: Called at fixed intervals for physics
export function fixedUpdate(context, fixedDeltaTime) {
  // Physics-related updates go here
}

// Optional: Called when the script is removed or entity is destroyed
export function destroy(context) {
  console.log('Script destroyed');
}
`;

    try {
      console.log(`Creating script file: ${scriptPath} in project: ${currentProject.path}`);
      
      // Save the script file
      await window.projectAPI.saveScriptFile(currentProject.path, scriptPath, scriptContent);
      
      toast.success(`Created script: ${scriptPath}`);
      setNewScriptName("");
      setIsCreatingNew(false);
      
      // Give the compilation system time to detect and compile the script
      console.log('Waiting for script compilation...');
      setTimeout(async () => {
        console.log('Checking if script was compiled and loaded...');
        const scriptId = scriptLoaderService.getScriptIdFromPath(currentProject.path, scriptPath);
        console.log(`Looking for script with ID: ${scriptId}`);
        
        // Check if script is available in the manager
        if (scriptManager.getScript(scriptId)) {
          console.log('Script found in manager, attempting to attach...');
          onScriptCreated(scriptId);
        } else {
          console.log('Script not yet available in manager');
          toast.info(`Script created but still compiling...`);
        }
      }, 3000); // Increased timeout to 3 seconds
      
    } catch (error) {
      console.error('Failed to create script:', error);
      toast.error(`Failed to create script: ${error}`);
    }
  };

  const handleEditScript = async (scriptPath: string) => {
    if (!currentProject) return;
    
    try {
      // Open the script in the code editor
      await window.projectAPI.openScriptInEditor(currentProject.path, scriptPath);
      toast.success(`Opened ${scriptPath} in editor`);
    } catch (error) {
      toast.error(`Failed to open script: ${error}`);
    }
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
      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
        <AlertCircle className="h-6 w-6 mb-2" />
        <p className="text-sm">No project loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create New Script */}
      <Card className="bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Script
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isCreatingNew ? (
            <>
              <Input
                placeholder="script-name.ts"
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateScript()}
                className="bg-white/5 border-white/10 text-white"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateScript}
                  className="flex-1 bg-lime-500/20 text-lime-300 hover:bg-lime-500/30"
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
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsCreatingNew(true)}
              className="w-full bg-lime-500/20 text-lime-300 hover:bg-lime-500/30"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Script
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-white/10" />

      {/* Existing Scripts */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-lime-300 uppercase tracking-wide flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Project Scripts
          <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-lime-500/20 text-lime-300">
            {availableScripts.length}
          </Badge>
        </h4>

        <ScrollArea className="h-64">
          {availableScripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <FileCode className="h-6 w-6 mb-2" />
              <p className="text-sm">No scripts found</p>
              <p className="text-xs">Create your first script above</p>
            </div>
          ) : (
            <div className="space-y-2">
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
    <Card className="bg-white/5 hover:bg-white/10 transition-colors">
      <CardHeader className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <FileCode className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm text-white truncate">
                {scriptName}
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 truncate">
                {scriptPath}
              </CardDescription>
              {error && (
                <p className="text-xs text-red-400 mt-1 line-clamp-2">
                  {error}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {status === 'compiling' && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-yellow-500/20 text-yellow-300">
                <Loader className="h-3 w-3 animate-spin" />
              </Badge>
            )}
            {status === 'success' && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-500/20 text-green-300">
                <CheckCircle className="h-3 w-3" />
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-red-500/20 text-red-300">
                <AlertCircle className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-1 mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="text-xs h-7 text-gray-400 hover:text-white"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRecompile}
            className="text-xs h-7 text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Recompile
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
} 