import React from "react";
import { ScriptManager, ScriptParameter, EntityScriptParameters } from "@/models";
import { DragInput } from "@/components/ui/drag-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

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
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Script Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parameters.map((param) => (
          <div key={param.name} className="space-y-1">
            <Label className="text-gray-300 text-xs">
              {param.name}
              {param.description && (
                <span className="text-gray-500 ml-1">({param.description})</span>
              )}
            </Label>
            
            {param.type === 'number' && (
              <DragInput
                value={currentParams[param.name] || param.defaultValue}
                onChange={(value) => handleParameterChange(param.name, value)}
                min={param.min}
                max={param.max}
                step={param.step || 0.1}
                className="bg-white/5 border-white/20 text-white h-7"
              />
            )}
            
            {param.type === 'string' && (
              <input
                type="text"
                value={currentParams[param.name] || param.defaultValue}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="w-full bg-white/5 border-white/20 text-white text-sm h-7 px-2 rounded"
              />
            )}
            
            {param.type === 'boolean' && (
              <Switch
                checked={currentParams[param.name] !== undefined ? currentParams[param.name] : param.defaultValue}
                onCheckedChange={(checked) => handleParameterChange(param.name, checked)}
                className="data-[state=checked]:bg-lime-500"
              />
            )}
            
            {param.type === 'select' && param.options && (
              <Select
                value={currentParams[param.name] || param.defaultValue}
                onValueChange={(value) => handleParameterChange(param.name, value)}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/20 text-white h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {param.options.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {param.type === 'vector3' && (
              <div className="grid grid-cols-3 gap-1">
                {['x', 'y', 'z'].map((axis) => (
                  <DragInput
                    key={axis}
                    value={currentParams[param.name]?.[axis] || param.defaultValue?.[axis] || 0}
                    onChange={(value) => {
                      const currentVec = currentParams[param.name] || param.defaultValue || { x: 0, y: 0, z: 0 };
                      handleParameterChange(param.name, { ...currentVec, [axis]: value });
                    }}
                    min={param.min}
                    max={param.max}
                    step={param.step || 0.1}
                    className="bg-white/5 border-white/20 text-white h-7"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 