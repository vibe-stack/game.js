import React, { useState, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Search, Trash2, Upload, GripHorizontal } from 'lucide-react';
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
    assets,
    selectedMaterialId, 
    editingMeshId,
    isMaterialBrowserOpen,
    closeMaterialBrowser,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    setSelectedMaterial,
    assignMaterialToMesh,
    importAsset
  } = useEditorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uvScalesLocked, setUvScalesLocked] = useState(true);
  
  // Use the selected material directly from the store instead of local editing state
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  // Filter texture assets
  const textureAssets = assets.filter(asset => asset.type === 'texture');

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

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const dragRef = useRef<HTMLDivElement>(null);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    
    const rect = dragRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    
    // Prevent text selection while dragging
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isMaterialBrowserOpen) return null;

  const handleFileUpload = async () => {
    try {
      const filePaths = await window.projectAPI.selectAssetFiles();
      
      for (const filePath of filePaths) {
        try {
          await importAsset(filePath);
        } catch (error) {
          console.error('Failed to import asset:', error);
        }
      }
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  const updateTextureReference = (textureType: string, assetId: string | null) => {
    if (!selectedMaterial) return;

    const updatedTextures = selectedMaterial.textures ? [...selectedMaterial.textures] : [];
    
    // Remove existing texture of this type
    const filteredTextures = updatedTextures.filter(tex => tex.type !== textureType as any);
    
    // Add new texture if assetId is provided
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        filteredTextures.push({
          id: `texture_${Date.now()}`,
          assetId: assetId,
          type: textureType as any,
          wrapS: 'repeat',
          wrapT: 'repeat',
          repeat: { x: 1, y: 1 },
          offset: { x: 0, y: 0 },
          rotation: 0,
          flipY: true,
          generateMipmaps: true,
          anisotropy: 1
        });
      }
    }

    const updatedMaterial = {
      ...selectedMaterial,
      textures: filteredTextures,
      metadata: {
        ...selectedMaterial.metadata,
        modified: new Date()
      }
    };

    updateMaterial(selectedMaterial.id, updatedMaterial);
  };

  const updateTextureProperty = (textureType: string, property: string, value: any) => {
    if (!selectedMaterial) return;

    const updatedTextures = selectedMaterial.textures ? [...selectedMaterial.textures] : [];
    const textureIndex = updatedTextures.findIndex(tex => tex.type === textureType);
    
    if (textureIndex >= 0) {
      updatedTextures[textureIndex] = {
        ...updatedTextures[textureIndex],
        [property]: value
      };

      // If UV scales are locked and we're updating repeat, update all textures
      if (uvScalesLocked && property === 'repeat') {
        updatedTextures.forEach((tex, index) => {
          updatedTextures[index] = {
            ...tex,
            repeat: value
          };
        });
      }

      const updatedMaterial = {
        ...selectedMaterial,
        textures: updatedTextures,
        metadata: {
          ...selectedMaterial.metadata,
          modified: new Date()
        }
      };

      updateMaterial(selectedMaterial.id, updatedMaterial);
    }
  };

  const getTextureProperty = (textureType: string, property: string): any => {
    if (!selectedMaterial?.textures) return undefined;
    const texture = selectedMaterial.textures.find(tex => tex.type === textureType);
    return texture ? texture[property as keyof typeof texture] : undefined;
  };

  const getTextureAssetId = (textureType: string): string | undefined => {
    if (!selectedMaterial?.textures) return undefined;
    const texture = selectedMaterial.textures.find(tex => tex.type === textureType);
    return texture?.assetId;
  };

  const getTextureAssetName = (assetId: string | undefined): string => {
    if (!assetId) return 'None';
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown';
  };

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
    <div 
      ref={dragRef}
      className="fixed z-50 bg-background/50 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
      style={{ 
        left: position.x, 
        top: position.y,
        width: '900px',
        height: '700px'
      }}
    >
      {/* Header with drag handle */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-gradient-to-r from-background to-muted/20 rounded-t-xl cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Material Browser</h2>
            {editingMeshId && (
              <p className="text-sm text-muted-foreground">
                Editing material for: <span className="font-medium text-foreground">{editingMeshId}</span>
              </p>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={closeMaterialBrowser}
          className="hover:bg-destructive/10 hover:text-destructive rounded-lg"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-[calc(100%-80px)] overflow-hidden">
        {/* Left Panel - Material List */}
        <div className="w-80 border-r border-border/30 flex flex-col bg-muted/10">
          {/* Search and Filters */}
          <div className="p-4 border-b border-border/20 space-y-3 bg-background/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/80 border-border/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-background/80 border-border/30">
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

            <div className="flex gap-2">
              <Button onClick={createNewMaterial} className="flex-1 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Material
              </Button>
              <Button onClick={handleFileUpload} variant="outline" size="sm" className="border-border/30">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Material List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="text-muted-foreground text-sm mb-4">
                  {materials.length === 0 
                    ? "No materials yet. Create your first material!"
                    : "No materials match your search."
                  }
                </div>
                {materials.length === 0 && (
                  <Button onClick={createNewMaterial} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Material
                  </Button>
                )}
              </div>
            ) : (
              filteredMaterials.map(material => (
                <Card 
                  key={material.id}
                  className={`cursor-pointer transition-all duration-200 p-3 hover:shadow-md border-border/30 ${
                    selectedMaterialId === material.id
                      ? 'ring-2 ring-primary/50 bg-primary/5 border-primary/30'
                      : 'hover:bg-muted/30 hover:border-border/50'
                  }`}
                  onClick={() => {
                    setSelectedMaterial(material.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <MaterialPreview 
                        materialProperties={material.properties}
                        size={48}
                        autoRotate={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate text-foreground">{material.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {material.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground">
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
        <div className="flex-1 flex flex-col bg-background/20">
          {selectedMaterial ? (
            <>
              {/* Preview Section */}
              <div className="p-6 border-b border-border/20 bg-gradient-to-br from-muted/20 to-background">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <MaterialPreview 
                      materialProperties={selectedMaterial.properties}
                      size={120}
                      autoRotate={true}
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <Input
                      value={selectedMaterial.name}
                      onChange={(e) => updateMaterialName(e.target.value)}
                      className="font-medium text-lg bg-background/80 border-border/30"
                      placeholder="Material name"
                    />
                    <Input
                      value={selectedMaterial.description}
                      onChange={(e) => updateMaterialDescription(e.target.value)}
                      placeholder="Material description"
                      className="bg-background/80 border-border/30"
                    />
                    <Input
                      value={selectedMaterial.metadata.category}
                      onChange={(e) => updateMaterialMetadata('category', e.target.value)}
                      placeholder="Category"
                      className="bg-background/80 border-border/30"
                    />
                  </div>
                </div>
              </div>

              {/* Material Properties - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Basic Properties */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground text-base border-b border-border/20 pb-2">Material Properties</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Material Type</Label>
                        <Select
                          value={selectedMaterial.properties.type}
                          onValueChange={(type) => updateMaterialProperty('type', type)}
                        >
                          <SelectTrigger className="bg-background border-border/30">
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

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={getMaterialColor(selectedMaterial)}
                            onChange={(e) => updateMaterialProperty('color', e.target.value)}
                            className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                          />
                          <Input
                            value={getMaterialColor(selectedMaterial)}
                            onChange={(e) => updateMaterialProperty('color', e.target.value)}
                            className="flex-1 bg-background border-border/30"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Side Rendering</Label>
                        <Select
                          value={String((selectedMaterial.properties as any).side || 0)}
                          onValueChange={(value) => updateMaterialProperty('side', parseInt(value))}
                        >
                          <SelectTrigger className="bg-background border-border/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Front Side Only</SelectItem>
                            <SelectItem value="1">Back Side Only</SelectItem>
                            <SelectItem value="2">Both Sides (Double)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(selectedMaterial.properties.type === 'standard' || 
                      selectedMaterial.properties.type === 'physical') && (
                      <div className="grid grid-cols-2 gap-4">
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
                      </div>
                    )}

                    <div className="flex items-center gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={(selectedMaterial.properties as any).wireframe || false}
                          onCheckedChange={(value) => updateMaterialProperty('wireframe', value)}
                        />
                        <Label className="text-sm font-medium">Wireframe</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={(selectedMaterial.properties as any).transparent || false}
                          onCheckedChange={(value) => updateMaterialProperty('transparent', value)}
                        />
                        <Label className="text-sm font-medium">Transparent</Label>
                      </div>
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

                  {/* Texture Assignment Section */}
                  {textureAssets.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground text-base border-b border-border/20 pb-2">Texture Maps</h3>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={uvScalesLocked}
                            onCheckedChange={setUvScalesLocked}
                          />
                          <Label className="text-sm font-medium">Lock UV Transforms</Label>
                        </div>
                      </div>
                      
                      {/* Global UV Scale when locked */}
                      {uvScalesLocked && selectedMaterial?.textures && selectedMaterial.textures.length > 0 && (
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/30 space-y-3">
                          <Label className="text-sm font-semibold text-foreground">Global UV Scale</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <DragInput
                              label="Scale X"
                              value={getTextureProperty('color', 'repeat')?.x || 1}
                              onChange={(value) => {
                                const newRepeat = { 
                                  x: value, 
                                  y: getTextureProperty('color', 'repeat')?.y || 1 
                                };
                                selectedMaterial.textures?.forEach(tex => {
                                  updateTextureProperty(tex.type, 'repeat', newRepeat);
                                });
                              }}
                              step={0.1}
                              precision={2}
                              min={-10}
                              max={10}
                            />
                            <DragInput
                              label="Scale Y"
                              value={getTextureProperty('color', 'repeat')?.y || 1}
                              onChange={(value) => {
                                const newRepeat = { 
                                  x: getTextureProperty('color', 'repeat')?.x || 1, 
                                  y: value 
                                };
                                selectedMaterial.textures?.forEach(tex => {
                                  updateTextureProperty(tex.type, 'repeat', newRepeat);
                                });
                              }}
                              step={0.1}
                              precision={2}
                              min={-10}
                              max={10}
                            />
                          </div>
                          
                          <Label className="text-sm font-semibold text-foreground">Global UV Offset</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <DragInput
                              label="Offset X"
                              value={getTextureProperty('color', 'offset')?.x || 0}
                              onChange={(value) => {
                                const newOffset = { 
                                  x: value, 
                                  y: getTextureProperty('color', 'offset')?.y || 0 
                                };
                                selectedMaterial.textures?.forEach(tex => {
                                  updateTextureProperty(tex.type, 'offset', newOffset);
                                });
                              }}
                              step={0.01}
                              precision={3}
                              min={-2}
                              max={2}
                            />
                            <DragInput
                              label="Offset Y"
                              value={getTextureProperty('color', 'offset')?.y || 0}
                              onChange={(value) => {
                                const newOffset = { 
                                  x: getTextureProperty('color', 'offset')?.x || 0, 
                                  y: value 
                                };
                                selectedMaterial.textures?.forEach(tex => {
                                  updateTextureProperty(tex.type, 'offset', newOffset);
                                });
                              }}
                              step={0.01}
                              precision={3}
                              min={-2}
                              max={2}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Individual texture maps with improved spacing and grouping */}
                      <div className="space-y-4">
                        {/* Color Map */}
                        <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                          <Label className="text-sm font-semibold text-foreground">Color Map</Label>
                          <Select
                            value={getTextureAssetId('color') || 'none'}
                            onValueChange={(value) => updateTextureReference('color', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="bg-background border-border/30">
                              <SelectValue>
                                {getTextureAssetName(getTextureAssetId('color'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {textureAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {getTextureAssetId('color') && !uvScalesLocked && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <DragInput
                                label="Scale X"
                                value={getTextureProperty('color', 'repeat')?.x || 1}
                                onChange={(value) => updateTextureProperty('color', 'repeat', { 
                                  x: value, 
                                  y: getTextureProperty('color', 'repeat')?.y || 1 
                                })}
                                step={0.1}
                                precision={2}
                                min={0.01}
                                max={10}
                              />
                              <DragInput
                                label="Scale Y"
                                value={getTextureProperty('color', 'repeat')?.y || 1}
                                onChange={(value) => updateTextureProperty('color', 'repeat', { 
                                  x: getTextureProperty('color', 'repeat')?.x || 1, 
                                  y: value 
                                })}
                                step={0.1}
                                precision={2}
                                min={0.01}
                                max={10}
                              />
                              <DragInput
                                label="Offset X"
                                value={getTextureProperty('color', 'offset')?.x || 0}
                                onChange={(value) => updateTextureProperty('color', 'offset', { 
                                  x: value, 
                                  y: getTextureProperty('color', 'offset')?.y || 0 
                                })}
                                step={0.01}
                                precision={3}
                                min={-2}
                                max={2}
                              />
                              <DragInput
                                label="Offset Y"
                                value={getTextureProperty('color', 'offset')?.y || 0}
                                onChange={(value) => updateTextureProperty('color', 'offset', { 
                                  x: getTextureProperty('color', 'offset')?.x || 0, 
                                  y: value 
                                })}
                                step={0.01}
                                precision={3}
                                min={-2}
                                max={2}
                              />
                            </div>
                          )}
                        </div>

                        {/* Normal Map */}
                        <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                          <Label className="text-sm font-semibold text-foreground">Normal Map</Label>
                          <Select
                            value={getTextureAssetId('normal') || 'none'}
                            onValueChange={(value) => updateTextureReference('normal', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="bg-background border-border/30">
                              <SelectValue>
                                {getTextureAssetName(getTextureAssetId('normal'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {textureAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {getTextureAssetId('normal') && (
                            <div className="space-y-3 pt-2">
                              <DragInput
                                label="Normal Scale"
                                value={(selectedMaterial.properties as any).normalScale?.x || 1}
                                onChange={(value) => updateMaterialProperty('normalScale', { x: value, y: value })}
                                step={0.1}
                                precision={2}
                                min={0}
                                max={3}
                              />
                              {!uvScalesLocked && (
                                <div className="grid grid-cols-2 gap-3">
                                  <DragInput
                                    label="Scale X"
                                    value={getTextureProperty('normal', 'repeat')?.x || 1}
                                    onChange={(value) => updateTextureProperty('normal', 'repeat', { 
                                      x: value, 
                                      y: getTextureProperty('normal', 'repeat')?.y || 1 
                                    })}
                                    step={0.1}
                                    precision={2}
                                    min={0.01}
                                    max={10}
                                  />
                                  <DragInput
                                    label="Scale Y"
                                    value={getTextureProperty('normal', 'repeat')?.y || 1}
                                    onChange={(value) => updateTextureProperty('normal', 'repeat', { 
                                      x: getTextureProperty('normal', 'repeat')?.x || 1, 
                                      y: value 
                                    })}
                                    step={0.1}
                                    precision={2}
                                    min={0.01}
                                    max={10}
                                  />
                                  <DragInput
                                    label="Offset X"
                                    value={getTextureProperty('normal', 'offset')?.x || 0}
                                    onChange={(value) => updateTextureProperty('normal', 'offset', { 
                                      x: value, 
                                      y: getTextureProperty('normal', 'offset')?.y || 0 
                                    })}
                                    step={0.01}
                                    precision={3}
                                    min={-2}
                                    max={2}
                                  />
                                  <DragInput
                                    label="Offset Y"
                                    value={getTextureProperty('normal', 'offset')?.y || 0}
                                    onChange={(value) => updateTextureProperty('normal', 'offset', { 
                                      x: getTextureProperty('normal', 'offset')?.x || 0, 
                                      y: value 
                                    })}
                                    step={0.01}
                                    precision={3}
                                    min={-2}
                                    max={2}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Displacement Map */}
                        <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                          <Label className="text-sm font-semibold text-foreground">Displacement Map</Label>
                          <Select
                            value={getTextureAssetId('displacement') || 'none'}
                            onValueChange={(value) => updateTextureReference('displacement', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="bg-background border-border/30">
                              <SelectValue>
                                {getTextureAssetName(getTextureAssetId('displacement'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {textureAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {getTextureAssetId('displacement') && (
                            <div className="space-y-3 pt-2">
                              <DragInput
                                label="Displacement Scale"
                                value={(selectedMaterial.properties as any).displacementScale || 1}
                                onChange={(value) => updateMaterialProperty('displacementScale', value)}
                                step={0.1}
                                precision={2}
                                min={0}
                                max={5}
                              />
                              <DragInput
                                label="Displacement Bias"
                                value={(selectedMaterial.properties as any).displacementBias || 0}
                                onChange={(value) => updateMaterialProperty('displacementBias', value)}
                                step={0.01}
                                precision={3}
                                min={-1}
                                max={1}
                              />
                              {!uvScalesLocked && (
                                <div className="grid grid-cols-2 gap-3">
                                  <DragInput
                                    label="Scale X"
                                    value={getTextureProperty('displacement', 'repeat')?.x || 1}
                                    onChange={(value) => updateTextureProperty('displacement', 'repeat', { 
                                      x: value, 
                                      y: getTextureProperty('displacement', 'repeat')?.y || 1 
                                    })}
                                    step={0.1}
                                    precision={2}
                                    min={0.01}
                                    max={10}
                                  />
                                  <DragInput
                                    label="Scale Y"
                                    value={getTextureProperty('displacement', 'repeat')?.y || 1}
                                    onChange={(value) => updateTextureProperty('displacement', 'repeat', { 
                                      x: getTextureProperty('displacement', 'repeat')?.x || 1, 
                                      y: value 
                                    })}
                                    step={0.1}
                                    precision={2}
                                    min={0.01}
                                    max={10}
                                  />
                                  <DragInput
                                    label="Offset X"
                                    value={getTextureProperty('displacement', 'offset')?.x || 0}
                                    onChange={(value) => updateTextureProperty('displacement', 'offset', { 
                                      x: value, 
                                      y: getTextureProperty('displacement', 'offset')?.y || 0 
                                    })}
                                    step={0.01}
                                    precision={3}
                                    min={-2}
                                    max={2}
                                  />
                                  <DragInput
                                    label="Offset Y"
                                    value={getTextureProperty('displacement', 'offset')?.y || 0}
                                    onChange={(value) => updateTextureProperty('displacement', 'offset', { 
                                      x: getTextureProperty('displacement', 'offset')?.x || 0, 
                                      y: value 
                                    })}
                                    step={0.01}
                                    precision={3}
                                    min={-2}
                                    max={2}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Roughness Map */}
                        {(selectedMaterial.properties.type === 'standard' || 
                          selectedMaterial.properties.type === 'physical') && (
                          <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                            <Label className="text-sm font-semibold text-foreground">Roughness Map</Label>
                            <Select
                              value={getTextureAssetId('roughness') || 'none'}
                              onValueChange={(value) => updateTextureReference('roughness', value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="bg-background border-border/30">
                                <SelectValue>
                                  {getTextureAssetName(getTextureAssetId('roughness'))}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {textureAssets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Metalness Map */}
                        {(selectedMaterial.properties.type === 'standard' || 
                          selectedMaterial.properties.type === 'physical') && (
                          <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                            <Label className="text-sm font-semibold text-foreground">Metalness Map</Label>
                            <Select
                              value={getTextureAssetId('metalness') || 'none'}
                              onValueChange={(value) => updateTextureReference('metalness', value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="bg-background border-border/30">
                                <SelectValue>
                                  {getTextureAssetName(getTextureAssetId('metalness'))}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {textureAssets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Emissive Map */}
                        <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                          <Label className="text-sm font-semibold text-foreground">Emissive Map</Label>
                          <Select
                            value={getTextureAssetId('emissive') || 'none'}
                            onValueChange={(value) => updateTextureReference('emissive', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="bg-background border-border/30">
                              <SelectValue>
                                {getTextureAssetName(getTextureAssetId('emissive'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {textureAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {getTextureAssetId('emissive') && (
                            <DragInput
                              label="Emissive Intensity"
                              value={(selectedMaterial.properties as any).emissiveIntensity || 0}
                              onChange={(value) => updateMaterialProperty('emissiveIntensity', value)}
                              step={0.1}
                              precision={2}
                              min={0}
                              max={3}
                            />
                          )}
                        </div>

                        {/* AO Map */}
                        <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                          <Label className="text-sm font-semibold text-foreground">AO Map</Label>
                          <Select
                            value={getTextureAssetId('ao') || 'none'}
                            onValueChange={(value) => updateTextureReference('ao', value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="bg-background border-border/30">
                              <SelectValue>
                                {getTextureAssetName(getTextureAssetId('ao'))}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {textureAssets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {getTextureAssetId('ao') && (
                            <DragInput
                              label="AO Intensity"
                              value={(selectedMaterial.properties as any).aoMapIntensity || 1}
                              onChange={(value) => updateMaterialProperty('aoMapIntensity', value)}
                              step={0.1}
                              precision={2}
                              min={0}
                              max={2}
                            />
                          )}
                        </div>

                        {/* Alpha Map */}
                        {(selectedMaterial.properties as any).transparent && (
                          <div className="p-4 bg-background border border-border/20 rounded-lg space-y-3">
                            <Label className="text-sm font-semibold text-foreground">Alpha Map</Label>
                            <Select
                              value={getTextureAssetId('alpha') || 'none'}
                              onValueChange={(value) => updateTextureReference('alpha', value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="bg-background border-border/30">
                                <SelectValue>
                                  {getTextureAssetName(getTextureAssetId('alpha'))}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {textureAssets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-border/20 bg-muted/20">
                <div className="flex gap-3">
                  {editingMeshId && (
                    <Button 
                      onClick={() => handleAssignMaterial(selectedMaterial.id)}
                      className="flex-1 bg-primary hover:bg-primary/90"
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
              <div className="text-center space-y-3">
                <div className="text-lg font-medium">No Material Selected</div>
                <div className="text-sm">Select a material to edit or create a new one</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 