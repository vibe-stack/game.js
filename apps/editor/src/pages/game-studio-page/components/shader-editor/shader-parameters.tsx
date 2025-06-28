import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { shaderManager, ShaderParameter } from '@/models';
import { DragInput } from '@/components/ui/drag-input';

interface ShaderParametersProps {
  shaderId: string;
}

export function ShaderParameters({ shaderId }: ShaderParametersProps) {
  const [parameters, setParameters] = useState<ShaderParameter[]>([]);

  useEffect(() => {
    const shader = shaderManager.getShader(shaderId);
    if (shader) {
      setParameters(shader.parameters || []);
    }
  }, [shaderId]);

  const handleParameterChange = (paramName: string, value: any) => {
    shaderManager.updateShaderParameter(shaderId, paramName, value);
    
    // Update local state
    setParameters(prev =>
      prev.map(p => p.name === paramName ? { ...p, defaultValue: value } : p)
    );
  };

  const addParameter = () => {
    const newParam: ShaderParameter = {
      name: `param_${Date.now()}`,
      type: 'float',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01
    };

    const shader = shaderManager.getShader(shaderId);
    if (shader) {
      const updatedParams = [...parameters, newParam];
      shader.parameters = updatedParams;
      setParameters(updatedParams);
    }
  };

  const removeParameter = (paramName: string) => {
    const shader = shaderManager.getShader(shaderId);
    if (shader) {
      const updatedParams = parameters.filter(p => p.name !== paramName);
      shader.parameters = updatedParams;
      setParameters(updatedParams);
    }
  };

  const renderParameterControl = (param: ShaderParameter) => {
    switch (param.type) {
      case 'float':
        if (param.min !== undefined && param.max !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Slider
                  value={[param.defaultValue || 0]}
                  onValueChange={([v]) => handleParameterChange(param.name, v)}
                  min={param.min}
                  max={param.max}
                  step={param.step || 0.01}
                  className="flex-1"
                />
                <DragInput
                  value={param.defaultValue || 0}
                  onChange={(v) => handleParameterChange(param.name, v)}
                  min={param.min}
                  max={param.max}
                  step={param.step || 0.01}
                  className="w-20"
                />
              </div>
            </div>
          );
        }
        return (
          <DragInput
            value={param.defaultValue || 0}
            onChange={(v) => handleParameterChange(param.name, v)}
            step={param.step || 0.01}
          />
        );

      case 'vec2':
        return (
          <div className="grid grid-cols-2 gap-2">
            <DragInput
              value={param.defaultValue?.[0] || 0}
              onChange={(v) => handleParameterChange(param.name, [v, param.defaultValue?.[1] || 0])}
            />
            <DragInput
              value={param.defaultValue?.[1] || 0}
              onChange={(v) => handleParameterChange(param.name, [param.defaultValue?.[0] || 0, v])}
            />
          </div>
        );

      case 'vec3':
        return (
          <div className="grid grid-cols-3 gap-2">
            <DragInput
              value={param.defaultValue?.[0] || 0}
              onChange={(v) => handleParameterChange(param.name, [v, param.defaultValue?.[1] || 0, param.defaultValue?.[2] || 0])}
            />
            <DragInput
              value={param.defaultValue?.[1] || 0}
              onChange={(v) => handleParameterChange(param.name, [param.defaultValue?.[0] || 0, v, param.defaultValue?.[2] || 0])}
            />
            <DragInput
              value={param.defaultValue?.[2] || 0}
              onChange={(v) => handleParameterChange(param.name, [param.defaultValue?.[0] || 0, param.defaultValue?.[1] || 0, v])}
            />
          </div>
        );

      case 'vec4':
        return (
          <div className="grid grid-cols-4 gap-2">
            <DragInput
              value={param.defaultValue?.[0] || 0}
              onChange={(v) => handleParameterChange(param.name, [v, param.defaultValue?.[1] || 0, param.defaultValue?.[2] || 0, param.defaultValue?.[3] || 1])}
            />
            <DragInput
              value={param.defaultValue?.[1] || 0}
              onChange={(v) => handleParameterChange(param.name, [param.defaultValue?.[0] || 0, v, param.defaultValue?.[2] || 0, param.defaultValue?.[3] || 1])}
            />
            <DragInput
              value={param.defaultValue?.[2] || 0}
              onChange={(v) => handleParameterChange(param.name, [param.defaultValue?.[0] || 0, param.defaultValue?.[1] || 0, v, param.defaultValue?.[3] || 1])}
            />
            <DragInput
              value={param.defaultValue?.[3] || 1}
              onChange={(v) => handleParameterChange(param.name, [param.defaultValue?.[0] || 0, param.defaultValue?.[1] || 0, param.defaultValue?.[2] || 0, v])}
            />
          </div>
        );

      case 'bool':
        return (
          <input
            type="checkbox"
            checked={param.defaultValue || false}
            onChange={(e) => handleParameterChange(param.name, e.target.checked)}
            className="h-4 w-4"
          />
        );

      case 'int':
        return (
          <Input
            type="number"
            value={param.defaultValue || 0}
            onChange={(e) => handleParameterChange(param.name, parseInt(e.target.value))}
            step={1}
          />
        );

      default:
        return <span className="text-sm text-muted-foreground">Unsupported type: {param.type}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shader Parameters</h3>
        <Button size="sm" onClick={addParameter}>
          <Plus className="w-4 h-4 mr-1" />
          Add Parameter
        </Button>
      </div>

      {parameters.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No parameters defined. Click "Add Parameter" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {parameters.map((param) => (
            <Card key={param.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{param.name}</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeParameter(param.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {param.description && (
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Type: {param.type}
                  </Label>
                  {renderParameterControl(param)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 