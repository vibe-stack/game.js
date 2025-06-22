import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Trash2, 
  Play, 
  Pause, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Info
} from "lucide-react";
import { ScriptManager, CompiledScript } from "@/models";
import { ScriptParameters } from "./script-parameters";

interface AttachedScriptsProps {
  attachedScripts: string[];
  scriptManager: ScriptManager;
  onDetachScript: (scriptId: string) => void;
  onToggleScript: (scriptId: string, enabled: boolean) => void;
  onSelectScript: (scriptId: string | null) => void;
  selectedScript: string | null;
  entityId: string;
}

export function AttachedScripts({
  attachedScripts,
  scriptManager,
  onDetachScript,
  onToggleScript,
  onSelectScript,
  selectedScript,
  entityId
}: AttachedScriptsProps) {
  
  if (attachedScripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-400 border-2 border-dashed border-gray-600 rounded-lg">
        <Play className="h-6 w-6 mb-2" />
        <p className="text-sm">No behaviors attached</p>
        <p className="text-xs text-gray-500">Add scripts from the Library tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachedScripts.map((scriptId) => {
        const script = scriptManager.getScript(scriptId);
        if (!script) return null;
        
        return (
          <ScriptCard
            key={scriptId}
            script={script}
            scriptManager={scriptManager}
            isSelected={selectedScript === scriptId}
            onSelect={() => onSelectScript(selectedScript === scriptId ? null : scriptId)}
            onDetach={() => onDetachScript(scriptId)}
            onToggle={(enabled) => onToggleScript(scriptId, enabled)}
            entityId={entityId}
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
  entityId: string;
}

function ScriptCard({ 
  script, 
  scriptManager, 
  isSelected, 
  onSelect, 
  onDetach, 
  onToggle,
  entityId
}: ScriptCardProps) {
  const metrics = scriptManager.getScriptPerformance(script.id);
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:bg-white/5 ${
        isSelected ? 'ring-2 ring-lime-400 bg-lime-500/10' : 'bg-white/5'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm text-white">{script.config.name}</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Priority: {script.config.priority}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status badges */}
            {script.hasErrors && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
            
            <Badge 
              variant={script.config.enabled ? "default" : "secondary"} 
              className={`text-xs px-2 py-0 ${
                script.config.enabled ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {script.config.enabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Error message if any */}
        {script.hasErrors && script.lastError && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
            <strong>Error:</strong> {script.lastError}
          </div>
        )}
        
        {/* Performance metrics */}
        {metrics && metrics.callCount > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="h-3 w-3" />
              Avg: {metrics.averageTime.toFixed(2)}ms
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <TrendingUp className="h-3 w-3" />
              Calls: {metrics.callCount}
            </div>
          </div>
        )}
        
        {/* Script lifecycle info */}
        <div className="mb-3 flex flex-wrap gap-1">
          {script.lifecycle.init && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-blue-400/30 text-blue-300">
              init
            </Badge>
          )}
          {script.lifecycle.update && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-green-400/30 text-green-300">
              update
            </Badge>
          )}
          {script.lifecycle.fixedUpdate && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-yellow-400/30 text-yellow-300">
              fixedUpdate
            </Badge>
          )}
          {script.lifecycle.destroy && (
            <Badge variant="outline" className="text-xs px-1 py-0 border-red-400/30 text-red-300">
              destroy
            </Badge>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={script.config.enabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-lime-500"
            />
            <span className="text-xs text-gray-400">
              {script.config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDetach();
            }}
            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Script details when selected */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400">Script ID:</span>
                <span className="ml-2 text-white font-mono">{script.id}</span>
              </div>
              
              {metrics && (
                <>
                  <div>
                    <span className="text-gray-400">Total Time:</span>
                    <span className="ml-2 text-white">{metrics.totalTime.toFixed(2)}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Max Time:</span>
                    <span className="ml-2 text-white">{metrics.maxTime.toFixed(2)}ms</span>
                  </div>
                </>
              )}
              
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${script.hasErrors ? 'text-red-300' : 'text-green-300'}`}>
                  {script.hasErrors ? 'Error' : 'OK'}
                </span>
              </div>
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
      </CardContent>
    </Card>
  );
} 