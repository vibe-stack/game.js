import React, { useState, useMemo } from "react";
import { GameWorldService } from "../../../services/game-world-service";
import useGameStudioStore from "@/stores/game-studio-store";
import { useEntityProperties, useEntityScriptState } from "@/hooks/use-entity-state";
import { useScriptManagerState } from "@/hooks/use-script-manager-state";
import { Entity, EXAMPLE_SCRIPTS, getExampleScriptIds } from "@/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

interface BehaviorsProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

export function Behaviors({ gameWorldService }: BehaviorsProps) {
  const { selectedEntity: selectedEntityId } = useGameStudioStore();
  const [activeView, setActiveView] = useState<'attached' | 'library' | 'editor'>('attached');
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  
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
  };

  const handleDetachScript = (scriptId: string) => {
    if (!selectedEntity) return;
    selectedEntity.detachScript(scriptId);
  };

  const handleToggleScript = (scriptId: string, enabled: boolean) => {
    if (!scriptManager) return;
    scriptManager.setScriptEnabled(scriptId, enabled);
  };

  if (!selectedEntity || !properties || !scriptManager) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400">
        <Activity className="h-8 w-8 mb-2" />
        <p>No entity selected</p>
        <p className="text-sm">Select an entity to manage its behaviors</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-lime-400" />
          <h3 className="text-lg font-semibold text-white">Behaviors</h3>
        </div>
        <Badge variant="secondary" className="bg-lime-500/20 text-lime-300">
          {attachedScripts.length} script{attachedScripts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        <Button
          variant={activeView === 'attached' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('attached')}
          className={`flex-1 text-xs ${
            activeView === 'attached' 
              ? 'bg-lime-500/20 text-lime-300 hover:bg-lime-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity className="h-3 w-3 mr-1" />
          Attached
        </Button>
        <Button
          variant={activeView === 'library' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('library')}
          className={`flex-1 text-xs ${
            activeView === 'library' 
              ? 'bg-lime-500/20 text-lime-300 hover:bg-lime-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Code className="h-3 w-3 mr-1" />
          Library
        </Button>
        <Button
          variant={activeView === 'editor' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('editor')}
          className={`flex-1 text-xs ${
            activeView === 'editor' 
              ? 'bg-lime-500/20 text-lime-300 hover:bg-lime-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Plus className="h-3 w-3 mr-1" />
          Create
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeView === 'attached' && (
          <AttachedScripts
            attachedScripts={attachedScripts}
            scriptManager={scriptManager}
            onDetachScript={handleDetachScript}
            onToggleScript={handleToggleScript}
            onSelectScript={setSelectedScript}
            selectedScript={selectedScript}
            entityId={selectedEntityId!}
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
              setActiveView('attached');
            }}
          />
        )}
      </ScrollArea>
    </div>
  );
} 