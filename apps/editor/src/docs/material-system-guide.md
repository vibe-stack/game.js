# Sophisticated Three.js Material System with TSL Support

## Overview

This document outlines the enhanced material system for our game editor, featuring:

- **Complete Three.js Material Support**: All material types (Basic, Lambert, Phong, Standard, Physical, Toon, Shader)
- **TSL (Three.js Shading Language) Integration**: JSON-based shader graph definitions
- **Centralized Material Management**: Reusable material libraries and presets
- **React Three Fiber Integration**: Seamless integration with R3F components
- **Comprehensive Texture Support**: All texture types with advanced properties

## Architecture

### 1. Type System (`types.d.ts`)

The type system supports:

```typescript
// Material Properties for each Three.js material type
type MaterialProperties = 
  | BasicMaterialProperties 
  | LambertMaterialProperties 
  | PhongMaterialProperties 
  | StandardMaterialProperties 
  | PhysicalMaterialProperties 
  | ToonMaterialProperties 
  | ShaderMaterialProperties;

// TSL Shader Graph with JSON node definitions
interface TSLShaderGraph {
  id: string;
  name: string;
  nodes: TSLGraphNode[];
  connections: TSLNodeConnection[];
  materialConnections: { colorNode?: string; normalNode?: string; /* ... */ };
}

// Centralized Material Definition
interface MaterialDefinition {
  id: string;
  properties: MaterialProperties;
  textures: TextureReference[];
  shaderGraphs: TSLShaderGraph[];
  metadata: { category: string; tags: string[]; /* ... */ };
}
```

### 2. Material System Service (`material-system.ts`)

Provides centralized material management:

```typescript
class MaterialSystem {
  // Library Management
  loadMaterialLibrary(library: MaterialLibrary): void
  getMaterialDefinition(materialId: string): MaterialDefinition
  
  // Texture Management
  async loadTexture(asset: EnhancedAssetReference): Promise<THREE.Texture>
  
  // TSL Compilation
  async compileTSLShaderGraph(graph: TSLShaderGraph): Promise<THREE.ShaderMaterial>
  
  // Material Creation
  async createMaterial(materialId: string): Promise<THREE.Material>
}
```

### 3. Enhanced Material Components (`enhanced-material-components.tsx`)

React Three Fiber integration:

```typescript
// Flexible material reference system
interface MaterialReference {
  type: 'library' | 'inline';
  materialId?: string; // For library materials
  properties?: any; // For inline materials
}

// Enhanced material component
function EnhancedMaterial({ materialRef, textures, uniforms }: EnhancedMaterialProps)

// Updated mesh renderer
function EnhancedMeshRenderer({ component }: EnhancedMeshRendererProps)
```

## TSL (Three.js Shading Language) Support

### JSON Shader Graph Definition

TSL shaders are defined as JSON graphs with nodes and connections:

```json
{
  "id": "detail-map-example",
  "name": "Detail Map Shader",
  "nodes": [
    {
      "id": "uvInput",
      "type": "uv",
      "outputs": [{"id": "uv", "type": "vec2"}]
    },
    {
      "id": "uvScale",
      "type": "multiply",
      "inputs": [
        {"id": "a", "type": "vec2"},
        {"id": "b", "type": "float", "defaultValue": 10.0}
      ],
      "outputs": [{"id": "result", "type": "vec2"}]
    },
    {
      "id": "detailTexture",
      "type": "texture",
      "textureReference": "detail-texture"
    }
  ],
  "connections": [
    {"from": {"nodeId": "uvInput", "outputId": "uv"}, "to": {"nodeId": "uvScale", "inputId": "a"}},
    {"from": {"nodeId": "uvScale", "outputId": "result"}, "to": {"nodeId": "detailTexture", "inputId": "uv"}}
  ],
  "materialConnections": {
    "colorNode": "materialOutput.baseColor"
  }
}
```

### TSL Node Types

Comprehensive node library:

- **Input Nodes**: `uniform`, `attribute`, `varying`, `texture`, `time`
- **Math Nodes**: `add`, `multiply`, `sin`, `cos`, `normalize`, `dot`, `cross`
- **UV Nodes**: `uv`, `screenUV`, `matcap`, `parallax`, `rotate`
- **Lighting Nodes**: `lambert`, `phong`, `physical`, `fresnel`
- **Utility Nodes**: `split`, `join`, `swizzle`, `if`, `switch`
- **Noise Nodes**: `noise`, `fbm`, `voronoi`, `checker`
- **Color Nodes**: `colorSpace`, `hue`, `saturation`, `contrast`

### Real TSL Example (from Three.js docs)

```typescript
// The classic detail map example from Three.js TSL documentation
import { texture, uv } from 'three/tsl';

const detail = texture(detailMap, uv().mul(10));
const material = new THREE.MeshStandardNodeMaterial();
material.colorNode = texture(colorMap).mul(detail);
```

## Material Types Support

### Physical Materials (PBR)

Complete support for `MeshPhysicalMaterial` with all advanced features:

```typescript
const goldMaterial: PhysicalMaterialProperties = {
  type: 'physical',
  color: '#ffd700',
  metalness: 1.0,
  roughness: 0.1,
  clearcoat: 0.3,
  clearcoatRoughness: 0.1,
  ior: 1.5,
  transmission: 0.0,
  thickness: 0.0,
  iridescence: 0.2,
  sheen: 0.1,
  sheenColor: '#ffffff',
  specularIntensity: 1.0,
  anisotropy: 0.0
};
```

### Shader Materials with TSL

```typescript
const tslMaterial: ShaderMaterialProperties = {
  type: 'shader',
  shaderGraph: 'detail-map-graph-id',
  uniforms: {
    detailScale: { type: 'float', value: 10.0 },
    time: { type: 'float', value: 0.0 }
  },
  lights: true
};
```

## Texture System

### Comprehensive Texture Support

All Three.js texture types with advanced properties:

```typescript
interface TextureReference {
  id: string;
  assetId: string;
  type: TextureType; // 'color' | 'normal' | 'roughness' | 'metalness' | etc.
  wrapS: 'repeat' | 'clampToEdge' | 'mirroredRepeat';
  repeat: Vector2;
  offset: Vector2;
  rotation: number;
  anisotropy: number;
  minFilter: 'linear' | 'nearest' | /* mipmap options */;
}
```

### Texture Types

- `color`, `normal`, `roughness`, `metalness`, `emissive`, `ao`
- `displacement`, `alpha`, `environment`, `lightmap`, `bumpmap`
- `clearcoat`, `clearcoat-normal`, `clearcoat-roughness`
- `iridescence`, `iridescence-thickness`, `sheen`
- `specular-intensity`, `specular-color`
- `transmission`, `thickness`

## Centralized Material Management

### Material Libraries

```typescript
interface MaterialLibrary {
  id: string;
  name: string;
  materials: MaterialDefinition[];
  sharedTextures: TextureReference[];
  sharedShaderGraphs: TSLShaderGraph[];
}
```

### Benefits

1. **Reusability**: Materials defined once, used everywhere
2. **Consistency**: Centralized definitions ensure consistent look
3. **Performance**: Material instances are cached and cloned
4. **Organization**: Categories, tags, and search functionality
5. **Modularity**: Tree-shakable material imports

## React Three Fiber Integration

### Enhanced Material Component

```tsx
// Library material reference
<EnhancedMaterial 
  materialRef={{ type: 'library', materialId: 'pbr-metal-gold' }}
  textures={{ color: '/textures/gold-diffuse.jpg' }}
/>

// Inline material definition
<EnhancedMaterial 
  materialRef={{ 
    type: 'inline', 
    properties: { 
      type: 'physical', 
      color: '#ffd700', 
      metalness: 1.0 
    } 
  }}
/>

// TSL shader material
<EnhancedMaterial 
  materialRef={{ 
    type: 'library', 
    materialId: 'tsl-detail-material' 
  }}
  uniforms={{ detailScale: 15.0 }}
/>
```

### Enhanced Mesh Renderer

```tsx
const meshComponent = {
  type: 'Mesh',
  properties: {
    geometry: 'sphere',
    materialRef: { type: 'library', materialId: 'chrome-metal' },
    textures: {
      color: '/textures/chrome-diffuse.jpg',
      normal: '/textures/chrome-normal.jpg',
      roughness: '/textures/chrome-roughness.jpg'
    },
    uniforms: { metalness: 0.9 }
  }
};

<EnhancedMeshRenderer component={meshComponent} />
```

## Material Presets

Pre-built materials for common use cases:

```typescript
export const MaterialPresets = {
  chrome: { /* Chrome metal properties */ },
  gold: { /* Gold metal properties */ },
  glass: { /* Realistic glass with transmission */ },
  detailMapped: { /* TSL shader example */ }
};
```

## Usage Examples

### Basic PBR Material

```tsx
const pbrMaterial = {
  type: 'inline',
  properties: {
    type: 'standard',
    color: '#ffffff',
    metalness: 0.8,
    roughness: 0.2
  }
};

<mesh>
  <sphereGeometry />
  <EnhancedMaterial materialRef={pbrMaterial} />
</mesh>
```

### Advanced Physical Material

```tsx
const glassMaterial = {
  type: 'inline',
  properties: {
    type: 'physical',
    transmission: 1.0,
    thickness: 0.5,
    ior: 1.52,
    transparent: true,
    opacity: 0.1
  }
};

<mesh>
  <torusGeometry />
  <EnhancedMaterial materialRef={glassMaterial} />
</mesh>
```

### TSL Shader Material

```tsx
const tslMaterial = {
  type: 'library',
  materialId: 'detail-mapped-surface'
};

<mesh>
  <planeGeometry />
  <EnhancedMaterial 
    materialRef={tslMaterial}
    textures={{
      baseTexture: '/textures/base.jpg',
      detailTexture: '/textures/detail.jpg'
    }}
    uniforms={{ detailScale: 10.0 }}
  />
</mesh>
```

## Future Enhancements

1. **Visual TSL Editor**: Node-based shader graph editor
2. **Material Marketplace**: Share and discover materials
3. **Live TSL Compilation**: Real-time shader graph compilation
4. **Material Variants**: Parameterized material variations
5. **Performance Analytics**: Material performance monitoring
6. **Auto-optimization**: Automatic shader optimization

## Migration Guide

### From Simple Materials

```tsx
// Old approach
<meshStandardMaterial 
  color="#ffffff" 
  metalness={0.8} 
  roughness={0.2} 
/>

// New approach
<EnhancedMaterial 
  materialRef={{
    type: 'inline',
    properties: {
      type: 'standard',
      color: '#ffffff',
      metalness: 0.8,
      roughness: 0.2
    }
  }}
/>
```

### To Library Materials

```tsx
// Create material definition
const materialLib = {
  id: 'my-materials',
  materials: [{
    id: 'my-pbr-material',
    properties: { /* ... */ },
    textures: [ /* ... */ ]
  }]
};

// Use in components
<EnhancedMaterial 
  materialRef={{ type: 'library', materialId: 'my-pbr-material' }}
/>
```

This sophisticated material system provides the foundation for creating complex, reusable, and performant materials in our game editor, with full support for modern Three.js features and TSL shader graphs. 