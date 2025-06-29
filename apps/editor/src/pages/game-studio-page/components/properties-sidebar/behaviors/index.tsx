import React, { useState, useMemo } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import useGameStudioStore from "@/stores/game-studio-store";
import { useEntityProperties, useEntityScriptState } from "@/hooks/use-entity-state";
import { useScriptManagerState } from "@/hooks/use-script-manager-state";
import { Entity, EXAMPLE_SCRIPTS, getExampleScriptIds } from "@/models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Code, 
  Activity,
  Zap,
  Clock
} from "lucide-react";
import { AttachedScripts } from "./attached-scripts";
import { ScriptLibrary } from "./script-library";
import { ScriptEditor } from "./script-editor";
import { ScriptLoaderService } from "@/services/script-loader-service";

interface BehaviorsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
  onOpenCodeEditor?: (scriptPath: string) => void;
}

export function Behaviors({ gameWorldService, onOpenCodeEditor }: BehaviorsProps) {
  const { selectedEntity: selectedEntityId, currentProject } = useGameStudioStore();
  const [activeView, setActiveView] = useState<'attached' | 'library' | 'editor'>('attached');
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  
  const scriptLoaderService = ScriptLoaderService.getInstance();
  
  // Get the selected entity
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId || !gameWorldService.current) return null;
    
    const gameWorld = gameWorldService.current.getGameWorld();
    if (!gameWorld) return null;
    
    const entitiesRegistry = gameWorld.getRegistryManager().getRegistry<Entity>("entities");
    if (!entitiesRegistry) return null;
    
    return entitiesRegistry.get(selectedEntityId) || null;
  }, [selectedEntityId, gameWorldService]);

  // Use the hooks to subscribe to entity and script manager changes
  const properties = useEntityProperties(selectedEntity);
  const scriptState = useEntityScriptState(selectedEntity);

  // Get script manager
  const scriptManager = useMemo(() => {
    if (!gameWorldService.current) return null;
    const gameWorld = gameWorldService.current.getGameWorld();
    return gameWorld?.getScriptManager() || null;
  }, [gameWorldService]);

  // Use the script manager state hook for React synchronization
  useScriptManagerState(scriptManager);

  // Get attached scripts - now using the dedicated script state hook
  const attachedScripts = useMemo(() => {
    return scriptState.attachedScripts;
  }, [scriptState.attachedScripts, scriptState._scriptStateCounter]); // Include counter for force dependency

  // Load example scripts if not loaded
  React.useEffect(() => {
    if (!scriptManager) return;
    
    // Load example scripts
    const exampleScriptIds = getExampleScriptIds();
    for (const scriptKey of exampleScriptIds) {
      const scriptConfig = EXAMPLE_SCRIPTS[scriptKey as keyof typeof EXAMPLE_SCRIPTS];
      if (!scriptManager.getScript(scriptConfig.id)) {
        try {
          scriptManager.compileScript(scriptConfig);
        } catch (error) {
          console.error(`Failed to load example script ${scriptConfig.id}:`, error);
        }
      }
    }
  }, [scriptManager]);

  const handleAttachScript = (scriptId: string) => {
    if (!selectedEntity || !scriptManager) return;
    
    const script = scriptManager.getScript(scriptId);
    if (!script) {
      console.error(`Script ${scriptId} not found`);
      return;
    }
    
    if (selectedEntity.hasScript(scriptId)) {
      console.warn(`Script ${scriptId} already attached to entity`);
      return;
    }
    
    selectedEntity.attachScript(scriptId);
    // Force update view
    setActiveView('attached');
  };

  const handleDetachScript = (scriptId: string) => {
    if (!selectedEntity) return;
    selectedEntity.detachScript(scriptId);
  };

  const handleToggleScript = (scriptId: string, enabled: boolean) => {
    if (!scriptManager) return;
    scriptManager.setScriptEnabled(scriptId, enabled);
  };

  const handleEditScript = (scriptPath: string) => {
    if (!currentProject || !onOpenCodeEditor) return;
    
    // Construct the full absolute path
    // If the path is already absolute, use it as is
    // Otherwise, construct it relative to the project's scripts directory
    let fullPath: string;
    if (scriptPath.startsWith('/') || scriptPath.includes(':\\')) {
      // Already an absolute path
      fullPath = scriptPath;
    } else if (scriptPath.startsWith('scripts/')) {
      // Path includes scripts directory
      fullPath = `${currentProject.path}/${scriptPath}`;
    } else {
      // Just the filename, add scripts directory
      fullPath = `${currentProject.path}/scripts/${scriptPath}`;
    }

    onOpenCodeEditor(fullPath);
  };

  if (!selectedEntity || !properties || !scriptManager) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No entity selected</p>
        <p className="text-xs opacity-60">Select an entity to manage its behaviors</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">Behaviors</h3>
        <Badge 
          variant="secondary" 
          className="text-xs bg-gray-800 text-gray-400 border-0"
        >
          {attachedScripts.length}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 p-0.5 rounded-md bg-gray-900/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveView('attached')}
          className={`flex-1 h-7 text-xs transition-colors ${
            activeView === 'attached' 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Attached
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveView('library')}
          className={`flex-1 h-7 text-xs transition-colors ${
            activeView === 'library' 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Library
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveView('editor')}
          className={`flex-1 h-7 text-xs transition-colors ${
            activeView === 'editor' 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          Create
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-24rem)]">
        {activeView === 'attached' && (
          <AttachedScripts
            attachedScripts={attachedScripts}
            scriptManager={scriptManager}
            scriptLoaderService={scriptLoaderService}
            currentProject={currentProject}
            onDetachScript={handleDetachScript}
            onToggleScript={handleToggleScript}
            onSelectScript={setSelectedScript}
            selectedScript={selectedScript}
            entityId={selectedEntityId!}
            onEditScript={handleEditScript}
          />
        )}
        
        {activeView === 'library' && (
          <ScriptLibrary
            scriptManager={scriptManager}
            attachedScripts={attachedScripts}
            onAttachScript={handleAttachScript}
          />
        )}
        
        {activeView === 'editor' && (
          <ScriptEditor
            scriptManager={scriptManager}
            onScriptCreated={(scriptId: string) => {
              handleAttachScript(scriptId);
            }}
            onEditScript={handleEditScript}
          />
        )}
      </ScrollArea>
    </div>
  );
} 