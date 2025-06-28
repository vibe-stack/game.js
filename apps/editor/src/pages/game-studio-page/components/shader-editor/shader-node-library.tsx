import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const NODE_CATEGORIES = {
  input: [
    { type: 'uv', label: 'UV', description: 'UV coordinates' },
    { type: 'position', label: 'Position', description: 'Vertex position' },
    { type: 'normal', label: 'Normal', description: 'Surface normal' },
    { type: 'time', label: 'Time', description: 'Animation time' },
    { type: 'cameraPosition', label: 'Camera Position', description: 'Camera world position' },
    { type: 'cameraViewDirection', label: 'View Direction', description: 'Camera view direction' },
  ],
  math: [
    { type: 'add', label: 'Add', description: 'Add two values' },
    { type: 'subtract', label: 'Subtract', description: 'Subtract two values' },
    { type: 'multiply', label: 'Multiply', description: 'Multiply two values' },
    { type: 'divide', label: 'Divide', description: 'Divide two values' },
    { type: 'sin', label: 'Sin', description: 'Sine function' },
    { type: 'cos', label: 'Cos', description: 'Cosine function' },
    { type: 'pow', label: 'Power', description: 'Power function' },
    { type: 'sqrt', label: 'Square Root', description: 'Square root' },
    { type: 'normalize', label: 'Normalize', description: 'Normalize vector' },
    { type: 'dot', label: 'Dot Product', description: 'Dot product' },
    { type: 'cross', label: 'Cross Product', description: 'Cross product' },
    { type: 'mix', label: 'Mix/Lerp', description: 'Linear interpolation' },
    { type: 'clamp', label: 'Clamp', description: 'Clamp value' },
    { type: 'smoothstep', label: 'Smoothstep', description: 'Smooth interpolation' },
  ],
  texture: [
    { type: 'texture', label: 'Texture 2D', description: 'Sample 2D texture' },
    { type: 'cubeTexture', label: 'Cube Texture', description: 'Sample cube texture' },
  ],
  color: [
    { type: 'rgb', label: 'RGB Color', description: 'RGB color value' },
    { type: 'rgba', label: 'RGBA Color', description: 'RGBA color value' },
    { type: 'hsv', label: 'HSV', description: 'HSV color space' },
  ],
  utility: [
    { type: 'float', label: 'Float', description: 'Single float value' },
    { type: 'vec2', label: 'Vector2', description: '2D vector' },
    { type: 'vec3', label: 'Vector3', description: '3D vector' },
    { type: 'vec4', label: 'Vector4', description: '4D vector' },
    { type: 'uniform', label: 'Uniform', description: 'Shader uniform' },
    { type: 'varying', label: 'Varying', description: 'Varying value' },
  ],
  output: [
    { type: 'output', label: 'Output', description: 'Shader output' },
  ]
};

export function ShaderNodeLibrary() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-4">
        {Object.entries(NODE_CATEGORIES).map(([category, nodes]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              {category}
            </h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <Card
                  key={node.type}
                  className="p-2 cursor-move hover:bg-accent transition-colors"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{node.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {node.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {node.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
} 