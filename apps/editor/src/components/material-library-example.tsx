import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

// Example TSL Shader Graph Definition (JSON)
const exampleTSLGraph = {
  id: 'detail-map-example',
  name: 'Detail Map Shader',
  description: 'Example TSL shader with detail mapping from Three.js docs',
  nodes: [
    {
      id: 'baseTexture',
      type: 'texture',
      name: 'Base Color Map',
      position: { x: 100, y: 100 },
      inputs: [
        { id: 'uv', name: 'UV', type: 'vec2', required: true, defaultValue: null }
      ],
      outputs: [
        { id: 'color', name: 'Color', type: 'vec4' }
      ],
      properties: {},
      textureReference: 'base-color-texture'
    },
    {
      id: 'detailTexture',
      type: 'texture',
      name: 'Detail Map',
      position: { x: 100, y: 300 },
      inputs: [
        { id: 'uv', name: 'UV', type: 'vec2', required: true, defaultValue: null }
      ],
      outputs: [
        { id: 'color', name: 'Color', type: 'vec4' }
      ],
      properties: {},
      textureReference: 'detail-texture'
    },
    {
      id: 'uvScale',
      type: 'multiply',
      name: 'UV Scale',
      position: { x: -100, y: 250 },
      inputs: [
        { id: 'a', name: 'UV', type: 'vec2', required: true, defaultValue: null },
        { id: 'b', name: 'Scale', type: 'float', required: true, defaultValue: 10.0 }
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'vec2' }
      ],
      properties: {}
    },
    {
      id: 'uvInput',
      type: 'uv',
      name: 'UV Coordinates',
      position: { x: -300, y: 200 },
      inputs: [],
      outputs: [
        { id: 'uv', name: 'UV', type: 'vec2' }
      ],
      properties: {}
    },
    {
      id: 'colorMultiply',
      type: 'multiply',
      name: 'Multiply Colors',
      position: { x: 400, y: 200 },
      inputs: [
        { id: 'a', name: 'Base Color', type: 'vec4', required: true, defaultValue: null },
        { id: 'b', name: 'Detail Color', type: 'vec4', required: true, defaultValue: null }
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'vec4' }
      ],
      properties: {}
    },
    {
      id: 'materialOutput',
      type: 'materialOutput',
      name: 'Material Output',
      position: { x: 600, y: 200 },
      inputs: [
        { id: 'baseColor', name: 'Base Color', type: 'vec4', required: true, defaultValue: null }
      ],
      outputs: [],
      properties: {}
    }
  ],
  connections: [
    { from: { nodeId: 'uvInput', outputId: 'uv' }, to: { nodeId: 'baseTexture', inputId: 'uv' } },
    { from: { nodeId: 'uvInput', outputId: 'uv' }, to: { nodeId: 'uvScale', inputId: 'a' } },
    { from: { nodeId: 'uvScale', outputId: 'result' }, to: { nodeId: 'detailTexture', inputId: 'uv' } },
    { from: { nodeId: 'baseTexture', outputId: 'color' }, to: { nodeId: 'colorMultiply', inputId: 'a' } },
    { from: { nodeId: 'detailTexture', outputId: 'color' }, to: { nodeId: 'colorMultiply', inputId: 'b' } },
    { from: { nodeId: 'colorMultiply', outputId: 'result' }, to: { nodeId: 'materialOutput', inputId: 'baseColor' } }
  ],
  materialConnections: {
    colorNode: 'materialOutput.baseColor'
  },
  metadata: {
    created: new Date(),
    modified: new Date(),
    version: '1.0.0',
    author: 'Example',
    tags: ['detail', 'mapping', 'texture']
  }
};

// Example Material Definitions
const exampleMaterials = [
  {
    id: 'pbr-metal-gold',
    name: 'Gold Metal',
    description: 'Realistic gold metal material',
    properties: {
      type: 'physical',
      color: '#ffd700',
      metalness: 1.0,
      roughness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      ior: 1.5,
      // ... other physical properties
    },
    textures: [
      {
        id: 'gold-base',
        assetId: 'gold-diffuse-texture',
        type: 'color',
        repeat: { x: 1, y: 1 },
        offset: { x: 0, y: 0 },
        rotation: 0,
        flipY: true,
        generateMipmaps: true,
        anisotropy: 4
      }
    ],
    metadata: {
      category: 'metals',
      tags: ['pbr', 'metal', 'gold', 'shiny'],
      created: new Date(),
      modified: new Date(),
      version: '1.0.0'
    }
  },
  {
    id: 'tsl-detail-material',
    name: 'Detail Mapped Surface',
    description: 'Material using TSL shader graph for detail mapping',
    properties: {
      type: 'shader',
      shaderGraph: 'detail-map-example',
      uniforms: {
        detailScale: { type: 'float', value: 10.0 },
        detailIntensity: { type: 'float', value: 1.0 }
      },
      lights: true,
      transparent: false,
      // ... other shader properties
    },
    shaderGraphs: [exampleTSLGraph],
    metadata: {
      category: 'advanced',
      tags: ['tsl', 'shader', 'detail', 'procedural'],
      created: new Date(),
      modified: new Date(),
      version: '1.0.0'
    }
  },
  {
    id: 'glass-realistic',
    name: 'Realistic Glass',
    description: 'Physical glass with transmission',
    properties: {
      type: 'physical',
      color: '#ffffff',
      metalness: 0.0,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 0.5,
      ior: 1.52,
      transparent: true,
      opacity: 0.1,
      // ... other physical properties
    },
    metadata: {
      category: 'transparent',
      tags: ['glass', 'transparent', 'physical', 'transmission'],
      created: new Date(),
      modified: new Date(),
      version: '1.0.0'
    }
  }
];

// Material Library Component
export function MaterialLibraryExample() {
  const [selectedMaterial, setSelectedMaterial] = useState(exampleMaterials[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(exampleMaterials.map(m => m.metadata.category));
    return Array.from(cats);
  }, []);

  const filteredMaterials = useMemo(() => {
    return exampleMaterials.filter(material => {
      const matchesSearch = material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           material.metadata.tags.some(tag => 
                             tag.toLowerCase().includes(searchQuery.toLowerCase())
                           );
      
      const matchesCategory = selectedCategory === 'all' || 
                             material.metadata.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const renderTSLGraph = (material: typeof selectedMaterial) => {
    if (material.properties.type !== 'shader' || !material.shaderGraphs?.length) {
      return null;
    }

    const graph = material.shaderGraphs[0];
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">TSL Shader Graph</CardTitle>
          <CardDescription>{graph.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-xs font-medium">Nodes:</div>
            <div className="grid grid-cols-2 gap-2">
              {graph.nodes.map(node => (
                <div key={node.id} className="p-2 bg-muted rounded text-xs">
                  <div className="font-medium">{node.name}</div>
                  <div className="text-muted-foreground">{node.type}</div>
                </div>
              ))}
            </div>
            <div className="text-xs font-medium mt-3">Graph Structure:</div>
            <div className="text-xs text-muted-foreground">
              UV → Scale → Detail Texture → Multiply → Material Output
              <br />
              UV → Base Texture → Multiply
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMaterialProperties = (material: typeof selectedMaterial) => {
    const props = material.properties;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Material Properties</CardTitle>
          <CardDescription>Type: {props.type}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(props).map(([key, value]) => {
            if (key === 'type' || key === 'shaderGraph' || key === 'uniforms') return null;
            
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            );
          })}
          
          {props.type === 'shader' && props.uniforms && (
            <div className="mt-3">
              <div className="text-xs font-medium mb-1">Shader Uniforms:</div>
              {Object.entries(props.uniforms).map(([key, uniform]: [string, any]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-mono">{uniform.type} = {String(uniform.value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Material Library</h2>
        <p className="text-sm text-muted-foreground">
          Sophisticated Three.js materials with TSL shader graph support
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-4">
        <Input
          placeholder="Search materials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Materials ({filteredMaterials.length})</h3>
          {filteredMaterials.map(material => (
            <Card 
              key={material.id} 
              className={`cursor-pointer transition-colors ${
                selectedMaterial.id === material.id 
                  ? 'ring-2 ring-primary' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedMaterial(material)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="font-medium text-sm">{material.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {material.description}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {material.properties.type}
                    </Badge>
                    {material.metadata.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Material Details */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-medium">{selectedMaterial.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedMaterial.description}</p>
          </div>

          {renderMaterialProperties(selectedMaterial)}
          {renderTSLGraph(selectedMaterial)}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usage in React Three Fiber</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`// Import the material system
import { materialSystem } from '@/services/material-system';

// In your component
const material = await materialSystem.createMaterial(
  '${selectedMaterial.id}', 
  assetMap
);

// Use with R3F
<mesh>
  <boxGeometry />
  <primitive object={material} />
</mesh>

// Or with TSL (when available)
import { ${selectedMaterial.properties.type}NodeMaterial } from 'three/examples/jsm/nodes/Nodes.js';

const material = new ${selectedMaterial.properties.type}NodeMaterial();
${selectedMaterial.properties.type === 'shader' && selectedMaterial.properties.shaderGraph ? 
`// TSL Graph compilation would happen here
material.colorNode = compiledTSLGraph.colorNode;` : 
`material.color.set('${selectedMaterial.properties.color || '#ffffff'}');`}`}
              </pre>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Edit Material
            </Button>
            <Button variant="outline" size="sm">
              Duplicate
            </Button>
            <Button variant="outline" size="sm">
              Export TSL
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 