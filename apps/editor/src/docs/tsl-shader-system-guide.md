# TSL Shader System Guide

## Overview

The TSL (Three.js Shading Language) Shader System provides a comprehensive node-based shader creation framework integrated directly into the game engine. Based on Three.js TSL documentation, it allows visual shader creation similar to Unreal Engine 5's material editor.

## Architecture

### Core Components

1. **Shader Manager** - Central management system for all shaders
2. **TSL Node Compiler** - Compiles node graphs to Three.js TSL code
3. **Visual Shader Editor** - ReactFlow-based node editor
4. **Shader Service** - Project integration and file management

### Data Flow

```
Visual Editor → Node Graph → TSL Compiler → Three.js Material
```

## Shader Types

- **Material Shaders** - For entity materials
- **Post-Processing Shaders** - Screen effects
- **Compute Shaders** - GPU computation
- **Particle Shaders** - Particle system effects

## TSL Node Categories

### Input Nodes
- UV coordinates
- Vertex position, normal, tangent
- Time and delta time
- Camera position and view direction
- Screen UV
- Vertex colors

### Math Operations
- Basic: add, subtract, multiply, divide
- Trigonometry: sin, cos, tan, etc.
- Interpolation: mix, smoothstep
- Clamping: min, max, clamp

### Vector Operations
- Normalize, length, distance
- Dot and cross products
- Reflect and refract
- Transform operations

### Texture Sampling
- 2D, 3D, and Cube textures
- Triplanar mapping

### Color Operations
- RGB/HSV conversions
- Hue, saturation, brightness
- Contrast and posterize

### Lighting Models
- Lambert, Phong, Blinn-Phong
- Physical (PBR)
- Fresnel effects

### Noise Functions
- Perlin, Simplex, Worley
- Voronoi, FBM, Turbulence

### Output Nodes
- Color, Normal, Metalness
- Roughness, Emissive, AO
- Displacement, Alpha

## Creating Shaders

### Via Visual Editor

1. Open the Shader Editor (sparkles icon in material section)
2. Drag nodes from the library
3. Connect nodes to create logic
4. Preview in real-time
5. Save shader to project

### Via Code

```typescript
import { shaderManager, TSLShaderConfig } from '@/models';

const config: TSLShaderConfig = {
  name: "My Custom Shader",
  type: "material",
  graph: {
    nodes: [
      {
        id: "uv1",
        type: "uv",
        position: { x: 0, y: 0 }
      },
      {
        id: "time1", 
        type: "time",
        position: { x: 0, y: 100 }
      },
      {
        id: "sin1",
        type: "sin",
        position: { x: 200, y: 100 }
      }
    ],
    connections: [
      {
        from: { nodeId: "time1", outputId: "value" },
        to: { nodeId: "sin1", inputId: "value" }
      }
    ]
  },
  materialConnections: {
    colorNode: "sin1"
  }
};

const shader = shaderManager.registerShader(config);
```

## Example Shaders

### Detail Map Shader

Combines base texture with detail texture for enhanced surface detail:

```json
{
  "name": "Detail Map Shader",
  "type": "material",
  "graph": {
    "nodes": [
      { "id": "uv", "type": "uv" },
      { "id": "scale", "type": "multiply" },
      { "id": "baseTexture", "type": "texture" },
      { "id": "detailTexture", "type": "texture" },
      { "id": "combine", "type": "multiply" }
    ],
    "connections": [
      { "from": { "nodeId": "uv", "outputId": "uv" }, 
        "to": { "nodeId": "baseTexture", "inputId": "uv" }},
      { "from": { "nodeId": "uv", "outputId": "uv" },
        "to": { "nodeId": "scale", "inputId": "a" }},
      { "from": { "nodeId": "scale", "outputId": "result" },
        "to": { "nodeId": "detailTexture", "inputId": "uv" }},
      { "from": { "nodeId": "baseTexture", "outputId": "color" },
        "to": { "nodeId": "combine", "inputId": "a" }},
      { "from": { "nodeId": "detailTexture", "outputId": "color" },
        "to": { "nodeId": "combine", "inputId": "b" }}
    ]
  },
  "materialConnections": {
    "colorNode": "combine"
  }
}
```

### Fresnel Glow Effect

Creates rim lighting effect using fresnel calculations:

```json
{
  "name": "Fresnel Glow",
  "type": "material",
  "graph": {
    "nodes": [
      { "id": "viewDir", "type": "cameraViewDirection" },
      { "id": "normal", "type": "normal" },
      { "id": "dot", "type": "dot" },
      { "id": "oneMinus", "type": "subtract" },
      { "id": "pow", "type": "pow" },
      { "id": "colorize", "type": "multiply" }
    ],
    "connections": [
      { "from": { "nodeId": "viewDir", "outputId": "dir" },
        "to": { "nodeId": "dot", "inputId": "a" }},
      { "from": { "nodeId": "normal", "outputId": "normal" },
        "to": { "nodeId": "dot", "inputId": "b" }},
      { "from": { "nodeId": "dot", "outputId": "result" },
        "to": { "nodeId": "oneMinus", "inputId": "b" }},
      { "from": { "nodeId": "oneMinus", "outputId": "result" },
        "to": { "nodeId": "pow", "inputId": "base" }},
      { "from": { "nodeId": "pow", "outputId": "result" },
        "to": { "nodeId": "colorize", "inputId": "a" }}
    ]
  },
  "materialConnections": {
    "emissiveNode": "colorize"
  }
}
```

## Shader Parameters

Shaders can expose parameters for runtime tweaking:

```typescript
{
  parameters: [
    {
      name: "detailScale",
      type: "float",
      defaultValue: 10,
      min: 0.1,
      max: 50,
      step: 0.1,
      description: "Scale of detail texture"
    },
    {
      name: "glowColor",
      type: "vec3",
      defaultValue: [0.3, 0.7, 1.0],
      description: "Fresnel glow color"
    }
  ]
}
```

## Integration with Materials

Shaders can be applied to materials in several ways:

### Direct Application

```typescript
const compiled = await shaderManager.compileShader(shaderId);
entity.setMaterial(compiled.material);
```

### Via Material System

Materials can reference shaders for custom effects:

```typescript
const materialDef = {
  type: 'shader',
  shaderGraph: 'my-shader-id',
  uniforms: {
    time: { value: 0 }
  }
};
```

## Serialization

Shaders are stored as JSON files in the project's `shaders/` directory:

```
project/
  shaders/
    detail-map.shader.json
    fresnel-glow.shader.json
    my-custom.shader.json
```

## Best Practices

1. **Naming**: Use descriptive names for nodes and shaders
2. **Organization**: Group related nodes visually in the editor
3. **Parameters**: Expose key values as parameters
4. **Performance**: Minimize texture samples and complex math
5. **Reusability**: Create modular shader components

## Debugging

- Use the preview panel to test shaders
- Check browser console for compilation errors
- Enable shader validation in development
- Use simple shapes for initial testing

## Advanced Features

### Custom Nodes

You can extend the node library:

```typescript
// In node-types.tsx
export const CustomNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      {/* Custom node implementation */}
    </BaseNode>
  );
};

// Register in nodeTypes
nodeTypes.myCustomNode = CustomNode;
```

### Post-Processing

Create screen effects:

```typescript
const postEffect: TSLShaderConfig = {
  type: "postprocess",
  graph: {
    nodes: [
      { id: "screen", type: "screenUV" },
      { id: "tex", type: "texture" },
      { id: "blur", type: "blur" }
    ]
  }
};
```

### Compute Shaders

For GPU computation:

```typescript
const compute: TSLShaderConfig = {
  type: "compute",
  graph: {
    nodes: [
      { id: "position", type: "attribute" },
      { id: "velocity", type: "uniform" },
      { id: "update", type: "add" }
    ]
  }
};
```

## Limitations

- WebGPU required for full TSL support
- Some advanced GLSL features not yet available
- Performance depends on node graph complexity
- Limited debugging compared to raw GLSL

## Future Enhancements

- Sub-graph support
- Custom function nodes
- Shader library sharing
- Performance profiling
- GLSL import/export 