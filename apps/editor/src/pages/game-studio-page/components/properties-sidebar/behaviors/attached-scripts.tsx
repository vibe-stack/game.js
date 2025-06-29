import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Trash2, 
  Play, 
  Pause, 
  AlertTriangle, 
  Clock,
  Edit2,
  Info,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { ScriptManager, CompiledScript } from "@/models";
import { ScriptParameters } from "./script-parameters";
import { toast } from "sonner";
import { ScriptLoaderService } from "@/services/script-loader-service";
import { GameProject } from "@/types/project";

interface AttachedScriptsProps {
  attachedScripts: string[];
  scriptManager: ScriptManager;
  scriptLoaderService: ScriptLoaderService;
  currentProject: GameProject | null;
  onDetachScript: (scriptId: string) => void;
  onToggleScript: (scriptId: string, enabled: boolean) => void;
  onSelectScript: (scriptId: string | null) => void;
  selectedScript: string | null;
  entityId: string;
  onEditScript: (scriptPath: string) => void;
}

export function AttachedScripts({
  attachedScripts,
  scriptManager,
  scriptLoaderService,
  currentProject,
  onDetachScript,
  onToggleScript,
  onSelectScript,
  selectedScript,
  entityId,
  onEditScript
}: AttachedScriptsProps) {
  
  const getScriptPath = (scriptId: string): string | null => {
    if (!currentProject) return null;
    
    // Try to get the path from the script loader service
    const loadedScripts = scriptLoaderService.getLoadedScripts(currentProject.path);
    const loadedScript = loadedScripts.find(ls => ls.config.id === scriptId);
    
    if (loadedScript && loadedScript.path) {
      return loadedScript.path;
    }
    
    // For example scripts that don't have file paths
    return null;
  };
  
  if (attachedScripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 rounded-lg p-4">
        <Play className="h-6 w-6 mb-2 opacity-50" />
        <p className="text-sm">No behaviors attached</p>
        <p className="text-xs opacity-60">Add scripts from the Library tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachedScripts.map((scriptId) => {
        const script = scriptManager.getScript(scriptId);
        if (!script) return null;
        
        const scriptPath = getScriptPath(scriptId);
        
        return (
          <ScriptCard
            key={`${scriptId}-${script.config.enabled}-${JSON.stringify(scriptManager.getScriptParameters(entityId, scriptId))}`}
            script={script}
            scriptManager={scriptManager}
            isSelected={selectedScript === scriptId}
            onSelect={() => onSelectScript(selectedScript === scriptId ? null : scriptId)}
            onDetach={() => onDetachScript(scriptId)}
            onToggle={(enabled) => onToggleScript(scriptId, enabled)}
            onEdit={() => {
              if (scriptPath) {
                onEditScript(scriptPath);
              } else {
                toast.error("This is an example script and cannot be edited");
              }
            }}
            entityId={entityId}
            isFileScript={!!scriptPath}
          />
        );
      })}
    </div>
  );
}

interface ScriptCardProps {
  script: CompiledScript;
  scriptManager: ScriptManager;
  isSelected: boolean;
  onSelect: () => void;
  onDetach: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  entityId: string;
  isFileScript: boolean;
}

function ScriptCard({ 
  script, 
  scriptManager, 
  isSelected, 
  onSelect, 
  onDetach, 
  onToggle,
  onEdit,
  entityId,
  isFileScript
}: ScriptCardProps) {
  const metrics = scriptManager.getScriptPerformance(script.id);
  
  return (
    <div 
      className={`rounded-md transition-all ${
        isSelected ? 'bg-gray-800 ring-1 ring-gray-700' : 'bg-gray-900/50 hover:bg-gray-800/50'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelect}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {isSelected ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-200 truncate">{script.config.name}</h4>
                {script.hasErrors && (
                  <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Priority: {script.config.priority}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {isFileScript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            
            <Switch
              checked={script.config.enabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-700 scale-75"
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDetach}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Error message if any */}
        {script.hasErrors && script.lastError && (
          <div className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-400">
            {script.lastError}
          </div>
        )}
        
        {/* Script details when selected */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
            {/* Performance metrics */}
            {metrics && metrics.callCount > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>Avg: {metrics.averageTime.toFixed(2)}ms</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span>Calls: {metrics.callCount}</span>
                </div>
              </div>
            )}
            
            {/* Lifecycle badges */}
            <div className="flex flex-wrap gap-1">
              {script.lifecycle.init && (
                <Badge variant="outline" className="text-xs h-5 px-1.5 border-gray-700 text-gray-400">
                  init
                </Badge>
              )}
              {script.lifecycle.update && (
                <Badge variant="outline" className="text-xs h-5 px-1.5 border-gray-700 text-gray-400">
                  update
                </Badge>
              )}
              {script.lifecycle.fixedUpdate && (
                <Badge variant="outline" className="text-xs h-5 px-1.5 border-gray-700 text-gray-400">
                  fixedUpdate
                </Badge>
              )}
              {script.lifecycle.destroy && (
                <Badge variant="outline" className="text-xs h-5 px-1.5 border-gray-700 text-gray-400">
                  destroy
                </Badge>
              )}
            </div>
            
            {/* Script Parameters */}
            {script.parameters && script.parameters.length > 0 && (
              <ScriptParameters
                entityId={entityId}
                scriptId={script.id}
                parameters={script.parameters}
                scriptManager={scriptManager}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 