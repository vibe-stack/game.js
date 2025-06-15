import React, { useState, useEffect, useMemo } from "react";
import { DragInput } from "@/components/ui/drag-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText } from "lucide-react";
import useEditorStore from "@/stores/editor-store";
import Vector3Controls from "../vector3-controls";
import { useScriptManager } from "../../../script-manager";

interface ScriptComponentProps {
  component: ScriptComponent;
  onUpdate: (updates: Partial<ScriptComponent>) => void;
}

export default function ScriptComponent({ component: propComponent, onUpdate }: ScriptComponentProps) {
  const { currentProject, selectedObjectData } = useEditorStore();
  const scriptManager = useScriptManager();
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptStatus, setScriptStatus] = useState<{ isWatching: boolean; compiledCount: number } | null>(null);
  
  // Get the current component data from the store to ensure we have the latest state
  const component = useMemo(() => {
    if (selectedObjectData) {
      const currentComponent = selectedObjectData.components.find(c => c.id === propComponent.id) as ScriptComponent;
      return currentComponent || propComponent;
    }
    return propComponent;
  }, [selectedObjectData, propComponent]);
  
  const props = component.properties;

  // Load available scripts and compilation status
  useEffect(() => {
    if (currentProject) {
      loadAvailableScripts();
      getScriptStatus();
      
      // Listen for script changes instead of polling
      const unsubscribe = scriptManager.onScriptsChanged(() => {
        loadAvailableScripts();
        getScriptStatus();
      });
      
      return unsubscribe;
    }
  }, [currentProject, scriptManager]);

  const loadAvailableScripts = async () => {
    if (!currentProject) return;

    try {
      const compiled = await window.scriptAPI.getCompiledScripts(currentProject.path);
      const scriptPaths = Object.keys(compiled);
      setAvailableScripts(scriptPaths);
    } catch (error) {
      console.error("Failed to load available scripts:", error);
      setAvailableScripts([]);
    }
  };

  const getScriptStatus = async () => {
    if (!currentProject) return;

    try {
      const status = await window.scriptAPI.getCompilationStatus(currentProject.path);
      setScriptStatus(status);
    } catch (error) {
      console.error("Failed to get script status:", error);
    }
  };

  const updateProperty = (key: keyof typeof props, value: any) => {
    onUpdate({
      properties: {
        ...props,
        [key]: value
      }
    });
  };

  const updateEventHandler = (handler: keyof typeof props.eventHandlers, enabled: boolean) => {
    updateProperty('eventHandlers', {
      ...props.eventHandlers,
      [handler]: enabled
    });
  };

  const updateParameter = (paramName: string, updates: Partial<typeof props.parameters[string]>) => {
    updateProperty('parameters', {
      ...props.parameters,
      [paramName]: {
        ...props.parameters[paramName],
        ...updates
      }
    });
  };

  const addParameter = () => {
    const paramName = `param${Object.keys(props.parameters).length + 1}`;
    updateProperty('parameters', {
      ...props.parameters,
      [paramName]: {
        type: "string",
        value: "",
        description: ""
      }
    });
  };

  const removeParameter = (paramName: string) => {
    const newParams = { ...props.parameters };
    delete newParams[paramName];
    updateProperty('parameters', newParams);
  };

  const renameParameter = (oldName: string, newName: string) => {
    if (oldName === newName || props.parameters[newName]) return;
    
    const newParams = { ...props.parameters };
    newParams[newName] = newParams[oldName];
    delete newParams[oldName];
    updateProperty('parameters', newParams);
  };

  const renderParameterValue = (paramName: string, param: typeof props.parameters[string]) => {
    switch (param.type) {
      case "string":
        return (
          <Input
            value={param.value || ""}
            onChange={(e) => updateParameter(paramName, { value: e.target.value })}
            className="h-7 text-xs"
            placeholder="Enter string value"
          />
        );
      case "number":
        return (
          <DragInput
            label=""
            value={param.value || 0}
            onChange={(value) => updateParameter(paramName, { value })}
            step={0.1}
            precision={2}
            compact
          />
        );
      case "boolean":
        return (
          <Switch
            checked={param.value || false}
            onCheckedChange={(value) => updateParameter(paramName, { value })}
          />
        );
      case "vector3":
        return (
          <Vector3Controls
            label=""
            value={param.value || { x: 0, y: 0, z: 0 }}
            onChange={(value) => updateParameter(paramName, { value })}
            step={0.1}
            precision={2}
          />
        );
      case "gameobject":
        return (
          <Input
            value={param.value || ""}
            onChange={(e) => updateParameter(paramName, { value: e.target.value })}
            className="h-7 text-xs"
            placeholder="GameObject ID"
          />
        );
      case "asset":
        return (
          <Input
            value={param.value || ""}
            onChange={(e) => updateParameter(paramName, { value: e.target.value })}
            className="h-7 text-xs"
            placeholder="Asset ID"
          />
        );
      default:
        return null;
    }
  };

  const handleManualCompile = async () => {
    if (!currentProject || !props.scriptPath) return;

    try {
      const result = await window.scriptAPI.compileScript(currentProject.path, props.scriptPath);
      if (result.success) {
        console.log(`Script compiled successfully: ${props.scriptPath}`);
      } else {
        console.error(`Script compilation failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to compile script:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Script File Selection */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Script File</Label>
        
        {scriptStatus && (
          <div className="text-xs text-muted-foreground">
            Status: {scriptStatus.isWatching ? 'Watching' : 'Not watching'} • 
            {scriptStatus.compiledCount} compiled scripts
          </div>
        )}

        <div className="space-y-2">
          <Select
            value={props.scriptPath || ""}
            onValueChange={(value) => updateProperty('scriptPath', value)}
            disabled={availableScripts.length === 0}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue placeholder={availableScripts.length === 0 ? "No compiled scripts found" : "Select a script file..."} />
            </SelectTrigger>
            <SelectContent>
              {availableScripts.map((scriptPath) => (
                <SelectItem key={scriptPath} value={scriptPath}>
                  {scriptPath}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableScripts.length === 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>No compiled scripts found.</div>
              <div>Make sure your TypeScript files are in the <code>scripts/</code> folder within your project.</div>
            </div>
          )}

          {props.scriptPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualCompile}
              className="h-6 px-2 text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              Recompile
            </Button>
          )}
        </div>
      </div>

      {/* Script Configuration */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Configuration</Label>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="autoStart"
              checked={props.autoStart}
              onCheckedChange={(value) => updateProperty('autoStart', value)}
            />
            <Label htmlFor="autoStart" className="text-xs">Auto Start</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="debugMode"
              checked={props.debugMode}
              onCheckedChange={(value) => updateProperty('debugMode', value)}
            />
            <Label htmlFor="debugMode" className="text-xs">Debug Mode</Label>
          </div>

          <DragInput
            label="Time Scale"
            value={props.timeScale}
            onChange={(value) => updateProperty('timeScale', value)}
            step={0.1}
            precision={2}
            min={0.01}
            max={10}
          />
        </div>
      </div>

      {/* Event Handlers */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Event Handlers</Label>
        
        <div className="space-y-2">
          {Object.entries(props.eventHandlers).map(([handler, enabled]) => (
            <div key={handler} className="flex items-center space-x-2">
              <Switch
                id={handler}
                checked={enabled || false}
                onCheckedChange={(value) => updateEventHandler(handler as keyof typeof props.eventHandlers, value)}
              />
              <Label htmlFor={handler} className="text-xs capitalize">
                {handler === 'init' ? 'Initialize' : 
                 handler === 'lateUpdate' ? 'Late Update' :
                 handler === 'fixedUpdate' ? 'Fixed Update' :
                 handler}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Parameters</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addParameter}
            className="h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        {Object.keys(props.parameters).length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            No parameters defined
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(props.parameters).map(([paramName, param]) => (
              <div key={paramName} className="space-y-2 p-3 border border-border/30 rounded">
                <div className="flex items-center gap-2">
                  <Input
                    value={paramName}
                    onChange={(e) => renameParameter(paramName, e.target.value)}
                    className="h-6 text-xs font-mono flex-1"
                    placeholder="Parameter name"
                  />
                  <Select
                    value={param.type}
                    onValueChange={(value) => updateParameter(paramName, { 
                      type: value as any, 
                      value: value === "boolean" ? false : 
                             value === "number" ? 0 : 
                             value === "vector3" ? { x: 0, y: 0, z: 0 } : ""
                    })}
                  >
                    <SelectTrigger className="h-6 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="vector3">Vector3</SelectItem>
                      <SelectItem value="gameobject">GameObject</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParameter(paramName)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  {renderParameterValue(paramName, param)}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={param.description || ""}
                    onChange={(e) => updateParameter(paramName, { description: e.target.value })}
                    className="h-16 text-xs resize-none"
                    placeholder="Parameter description..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 