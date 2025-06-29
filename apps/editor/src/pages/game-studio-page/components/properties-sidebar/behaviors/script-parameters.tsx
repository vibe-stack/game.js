import React from "react";
import { ScriptManager, ScriptParameter, EntityScriptParameters } from "@/models";
import { DragInput } from "@/components/ui/drag-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ScriptParametersProps {
  entityId: string;
  scriptId: string;
  parameters: ScriptParameter[];
  scriptManager: ScriptManager;
}

export function ScriptParameters({ 
  entityId, 
  scriptId, 
  parameters, 
  scriptManager 
}: ScriptParametersProps) {
  const currentParams = scriptManager.getScriptParametersWithDefaults(entityId, scriptId);

  const handleParameterChange = (paramName: string, value: any) => {
    const newParams = { ...currentParams, [paramName]: value };
    scriptManager.setScriptParameters(entityId, scriptId, newParams);
  };

  if (!parameters || parameters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Parameters</h5>
      <div className="space-y-2.5">
        {parameters.map((param) => (
          <div key={param.name} className="space-y-1">
            <Label className="text-xs text-gray-400">
              {param.name}
              {param.description && (
                <span className="text-gray-600 ml-1 font-normal">• {param.description}</span>
              )}
            </Label>
            
            {param.type === 'number' && (
              <DragInput
                value={currentParams[param.name] !== undefined ? currentParams[param.name] : param.defaultValue}
                onChange={(value) => handleParameterChange(param.name, value)}
                min={param.min}
                max={param.max}
                step={param.step || 0.1}
                className="h-7 bg-gray-900/50 border-gray-800 text-gray-200 text-xs hover:bg-gray-800/50 focus:bg-gray-800"
              />
            )}
            
            {param.type === 'string' && (
              <Input
                type="text"
                value={currentParams[param.name] !== undefined ? currentParams[param.name] : param.defaultValue}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="h-7 bg-gray-900/50 border-gray-800 text-gray-200 text-xs placeholder:text-gray-600 hover:bg-gray-800/50 focus:bg-gray-800"
                placeholder={String(param.defaultValue || '')}
              />
            )}
            
            {param.type === 'boolean' && (
              <div className="flex items-center">
                <Switch
                  checked={currentParams[param.name] !== undefined ? currentParams[param.name] : param.defaultValue}
                  onCheckedChange={(checked) => handleParameterChange(param.name, checked)}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-700 scale-75"
                />
              </div>
            )}
            
            {param.type === 'select' && param.options && (
              <Select
                value={currentParams[param.name] !== undefined ? currentParams[param.name] : param.defaultValue}
                onValueChange={(value) => handleParameterChange(param.name, value)}
              >
                <SelectTrigger className="h-7 bg-gray-900/50 border-gray-800 text-gray-200 text-xs hover:bg-gray-800/50 focus:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {param.options.map((option: string) => (
                    <SelectItem key={option} value={option} className="text-xs">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {param.type === 'vector3' && (
              <div className="grid grid-cols-3 gap-1">
                {['x', 'y', 'z'].map((axis) => (
                  <div key={axis}>
                    <DragInput
                      value={currentParams[param.name]?.[axis] !== undefined 
                        ? currentParams[param.name][axis] 
                        : param.defaultValue?.[axis] || 0}
                      onChange={(value) => {
                        const currentVec = currentParams[param.name] || param.defaultValue || { x: 0, y: 0, z: 0 };
                        handleParameterChange(param.name, { ...currentVec, [axis]: value });
                      }}
                      min={param.min}
                      max={param.max}
                      step={param.step || 0.1}
                      className="h-7 bg-gray-900/50 border-gray-800 text-gray-200 text-xs hover:bg-gray-800/50 focus:bg-gray-800"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 