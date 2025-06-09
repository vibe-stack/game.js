import React, { useState, useMemo } from 'react';
import { X, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { DragInput } from './ui/drag-input';
import useEditorStore from '@/stores/editor-store';
import MaterialPreview from './material-preview';

export default function MaterialBrowser() {
  const { 
    materials, 
    selectedMaterialId, 
    editingMeshId,
    isMaterialBrowserOpen,
    closeMaterialBrowser,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    setSelectedMaterial,
    assignMaterialToMesh
  } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Use the selected material directly from the store instead of local editing state
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const categories = useMemo(() => {
    const cats = new Set(materials.map(m => m.metadata.category));
    return Array.from(cats);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchesSearch = material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           material.metadata.tags.some(tag => 
                             tag.toLowerCase().includes(searchQuery.toLowerCase())
                           );
      
      const matchesCategory = selectedCategory === 'all' || 
                             material.metadata.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  if (!isMaterialBrowserOpen) return null;

  const createNewMaterial = () => {
    const newMaterial: MaterialDefinition = {
      id: `material_${Date.now()}`,
      name: 'New Material',
      description: 'A new material',
      properties: {
        type: 'standard',
        color: '#ffffff',
        metalness: 0,
        roughness: 0.5,
        transparent: false,
        opacity: 1,
        alphaTest: 0,
        side: 0,
        visible: true,
        depthTest: true,
        depthWrite: true,
        blending: 'normal',
        premultipliedAlpha: false,
        dithering: false,
        fog: true,
        wireframe: false,
        vertexColors: false,
        clipIntersection: false,
        clipShadows: false,
        colorWrite: true,
        polygonOffset: false,
        polygonOffsetFactor: 0,
        polygonOffsetUnits: 0,
        alphaHash: false,
        stencilWrite: false,
        stencilFunc: 519,
        stencilRef: 0,
        stencilFuncMask: 255,
        stencilFail: 7680,
        stencilZFail: 7680,
        stencilZPass: 7680,
        stencilWriteMask: 255,
        emissive: '#000000',
        emissiveIntensity: 0,
        envMapIntensity: 1,
        lightMapIntensity: 1,
        aoMapIntensity: 1,
        bumpScale: 1,
        normalMapType: 'tangentSpace',
        normalScale: { x: 1, y: 1 },
        displacementScale: 1,
        displacementBias: 0
      } as StandardMaterialProperties,
      textures: [],
      shaderGraphs: [],
      previewSettings: {
        geometry: 'sphere',
        lighting: 'studio'
      },
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
        tags: ['custom'],
        category: 'custom'
      }
    };

    addMaterial(newMaterial);
    setSelectedMaterial(newMaterial.id);
  };

  const handleAssignMaterial = (materialId: string) => {
    if (editingMeshId) {
      assignMaterialToMesh(editingMeshId, materialId);
      closeMaterialBrowser();
    }
  };

  const updateMaterialProperty = (key: string, value: any) => {
    if (selectedMaterial) {
      const updatedMaterial = {
        ...selectedMaterial,
        properties: {
          ...selectedMaterial.properties,
          [key]: value
        } as MaterialProperties,
        metadata: {
          ...selectedMaterial.metadata,
          modified: new Date()
        }
      };
      
      // Ensure the material has a valid structure before updating
      if (updatedMaterial.id && updatedMaterial.properties && updatedMaterial.metadata) {
        updateMaterial(selectedMaterial.id, updatedMaterial);
      } else {
        console.error('Invalid material structure:', updatedMaterial);
      }
    }
  };

  const updateMaterialMetadata = (key: string, value: any) => {
    if (selectedMaterial) {
      const updatedMaterial = {
        ...selectedMaterial,
        metadata: {
          ...selectedMaterial.metadata,
          [key]: value,
          modified: new Date()
        }
      };
      
      if (updatedMaterial.id && updatedMaterial.metadata) {
        updateMaterial(selectedMaterial.id, updatedMaterial);
      } else {
        console.error('Invalid material metadata structure:', updatedMaterial);
      }
    }
  };

  const updateMaterialName = (name: string) => {
    if (selectedMaterial && name.trim()) {
      const updatedMaterial = {
        ...selectedMaterial,
        name: name.trim(),
        metadata: {
          ...selectedMaterial.metadata,
          modified: new Date()
        }
      };
      updateMaterial(selectedMaterial.id, updatedMaterial);
    }
  };

  const updateMaterialDescription = (description: string) => {
    if (selectedMaterial) {
      const updatedMaterial = {
        ...selectedMaterial,
        description: description.trim(),
        metadata: {
          ...selectedMaterial.metadata,
          modified: new Date()
        }
      };
      updateMaterial(selectedMaterial.id, updatedMaterial);
    }
  };

  const getMaterialColor = (material: any) => {
    const props = material.properties;
    return (props as any).color || '#ffffff';
  };

  const handleDeleteMaterial = () => {
    if (selectedMaterial && confirm(`Are you sure you want to delete "${selectedMaterial.name}"?`)) {
      deleteMaterial(selectedMaterial.id);
      setSelectedMaterial(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Material Browser</h2>
            {editingMeshId && (
              <p className="text-sm text-muted-foreground">
                Editing material for mesh: {editingMeshId}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={closeMaterialBrowser}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Material List */}
          <div className="w-80 border-r flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
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

              <Button onClick={createNewMaterial} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Material
              </Button>
            </div>

            {/* Material List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredMaterials.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="text-muted-foreground text-sm mb-4">
                    {materials.length === 0 
                      ? "No materials yet. Create your first material!"
                      : "No materials match your search."
                    }
                  </div>
                  {materials.length === 0 && (
                    <Button onClick={createNewMaterial} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Material
                    </Button>
                  )}
                </div>
              ) : (
                filteredMaterials.map(material => (
                  <Card 
                    key={material.id}
                    className={`cursor-pointer transition-colors p-2 ${
                      selectedMaterialId === material.id
                        ? 'ring-2 ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedMaterial(material.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <MaterialPreview 
                        materialProperties={material.properties}
                        size={48}
                        autoRotate={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{material.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {material.description}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {material.properties.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Material Editor */}
          <div className="flex-1 flex flex-col">
            {selectedMaterial ? (
              <>
                {/* Preview */}
                <div className="p-4 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                    <MaterialPreview 
                      materialProperties={selectedMaterial.properties}
                      size={120}
                      autoRotate={true}
                    />
                    <div className="flex-1">
                      <div className="space-y-2">
                        <Input
                          value={selectedMaterial.name}
                          onChange={(e) => updateMaterialName(e.target.value)}
                          className="font-medium"
                          placeholder="Material name"
                        />
                        <Input
                          value={selectedMaterial.description}
                          onChange={(e) => updateMaterialDescription(e.target.value)}
                          placeholder="Material description"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={selectedMaterial.metadata.category}
                            onChange={(e) => updateMaterialMetadata('category', e.target.value)}
                            placeholder="Category"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Material Properties */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">Material Properties</h3>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Material Type</Label>
                      <Select
                        value={selectedMaterial.properties.type}
                        onValueChange={(type) => updateMaterialProperty('type', type)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="lambert">Lambert</SelectItem>
                          <SelectItem value="phong">Phong</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="toon">Toon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={getMaterialColor(selectedMaterial)}
                          onChange={(e) => updateMaterialProperty('color', e.target.value)}
                          className="w-8 h-8 rounded border"
                        />
                        <Input
                          value={getMaterialColor(selectedMaterial)}
                          onChange={(e) => updateMaterialProperty('color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {(selectedMaterial.properties.type === 'standard' || 
                      selectedMaterial.properties.type === 'physical') && (
                      <>
                        <DragInput
                          label="Metalness"
                          value={(selectedMaterial.properties as any).metalness || 0}
                          onChange={(value) => updateMaterialProperty('metalness', value)}
                          step={0.01}
                          precision={2}
                          min={0}
                          max={1}
                        />

                        <DragInput
                          label="Roughness"
                          value={(selectedMaterial.properties as any).roughness || 0.5}
                          onChange={(value) => updateMaterialProperty('roughness', value)}
                          step={0.01}
                          precision={2}
                          min={0}
                          max={1}
                        />
                      </>
                    )}

                    {selectedMaterial.properties.type === 'physical' && (
                      <>
                        <DragInput
                          label="Transmission"
                          value={(selectedMaterial.properties as any).transmission || 0}
                          onChange={(value) => updateMaterialProperty('transmission', value)}
                          step={0.01}
                          precision={2}
                          min={0}
                          max={1}
                        />

                        <DragInput
                          label="Thickness"
                          value={(selectedMaterial.properties as any).thickness || 0}
                          onChange={(value) => updateMaterialProperty('thickness', value)}
                          step={0.01}
                          precision={2}
                          min={0}
                          max={5}
                        />

                        <DragInput
                          label="IOR"
                          value={(selectedMaterial.properties as any).ior || 1.5}
                          onChange={(value) => updateMaterialProperty('ior', value)}
                          step={0.01}
                          precision={2}
                          min={1}
                          max={3}
                        />

                        <DragInput
                          label="Clearcoat"
                          value={(selectedMaterial.properties as any).clearcoat || 0}
                          onChange={(value) => updateMaterialProperty('clearcoat', value)}
                          step={0.01}
                          precision={2}
                          min={0}
                          max={1}
                        />

                        <DragInput
                          label="Clearcoat Roughness"
                          value={(selectedMaterial.properties as any).clearcoatRoughness || 0}
                          onChange={(value) => updateMaterialProperty('clearcoatRoughness', value)}
                          step={0.01}
                          precision={2}
                          min={0}
                          max={1}
                        />
                      </>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={(selectedMaterial.properties as any).wireframe || false}
                        onCheckedChange={(value) => updateMaterialProperty('wireframe', value)}
                      />
                      <Label className="text-xs">Wireframe</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={(selectedMaterial.properties as any).transparent || false}
                        onCheckedChange={(value) => updateMaterialProperty('transparent', value)}
                      />
                      <Label className="text-xs">Transparent</Label>
                    </div>

                    {(selectedMaterial.properties as any).transparent && (
                      <DragInput
                        label="Opacity"
                        value={(selectedMaterial.properties as any).opacity || 1}
                        onChange={(value) => updateMaterialProperty('opacity', value)}
                        step={0.01}
                        precision={2}
                        min={0}
                        max={1}
                      />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t bg-muted/20">
                  <div className="flex gap-2">
                    {editingMeshId && (
                      <Button 
                        onClick={() => handleAssignMaterial(selectedMaterial.id)}
                        className="flex-1"
                      >
                        Assign to Mesh
                      </Button>
                    )}
                    {selectedMaterial && (
                      <Button 
                        onClick={handleDeleteMaterial} 
                        variant="destructive" 
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Material
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a material to edit or create a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 