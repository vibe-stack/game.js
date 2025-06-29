import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialLibrary } from "./material-library";
import { MaterialProperties } from "./material-properties";
import { MaterialPreview } from "./material-preview";
import { MaterialApplicationService } from "./material-application-service";
import { EntityLookupService } from "./entity-lookup-service";
import useGameStudioStore from "@/stores/game-studio-store";
import { materialSystem } from "@/services/material-system";
import { MaterialDefinition } from "@/types/project";

interface MaterialEditorDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MaterialEditorDialog({ open, onClose }: MaterialEditorDialogProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDefinition | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialDefinition | null>(null);
  const [currentEntityMaterial, setCurrentEntityMaterial] = useState<MaterialDefinition | null>(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { materialEditorEntity, gameWorldService } = useGameStudioStore();

  // Load entity's current material when dialog opens
  useEffect(() => {
    if (open && materialEditorEntity && gameWorldService) {
      const entity = EntityLookupService.getEntityById(gameWorldService, materialEditorEntity);
      if (entity) {
        // Get current material from entity
        const currentMaterial = MaterialApplicationService.getCurrentMaterialFromEntity(entity);
        setCurrentEntityMaterial(currentMaterial);
        
        if (currentMaterial) {
          // Show the entity's current material
          setSelectedMaterial(currentMaterial);
          setEditingMaterial({ ...currentMaterial });
        } else {
          // No current material, show a default one
          const defaultMaterials = materialSystem.getAllMaterialDefinitions();
          if (defaultMaterials.length > 0) {
            setSelectedMaterial(defaultMaterials[0]);
            setEditingMaterial({ ...defaultMaterials[0] });
          }
        }
      }
    }
  }, [open, materialEditorEntity, gameWorldService]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedMaterial(null);
      setEditingMaterial(null);
      setCurrentEntityMaterial(null);
    }
  }, [open]);

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current?.contains(e.target as Node)) return;
    
    setIsDragging(true);
    const rect = dialogRef.current!.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleMaterialSelect = (material: MaterialDefinition) => {
    setSelectedMaterial(material);
    setEditingMaterial({ ...material });
  };

  const handleMaterialChange = (updatedMaterial: MaterialDefinition) => {
    setEditingMaterial(updatedMaterial);
    
    // Save changes to material registry immediately for persistence
    if (updatedMaterial.id && materialSystem.getMaterialDefinition(updatedMaterial.id)) {
      // Update existing material in registry
      materialSystem.loadMaterialLibrary({
        id: 'updated-materials-' + Date.now(),
        name: 'Updated Materials',
        version: '1.0.0',
        materials: [updatedMaterial],
        sharedShaderGraphs: [],
        sharedTextures: [],
        metadata: {
          created: new Date(),
          modified: new Date()
        }
      });
    }
  };

  const handleCancel = () => {
    // Restore original material if it was changed
    if (currentEntityMaterial && materialEditorEntity && gameWorldService) {
      const entity = EntityLookupService.getEntityById(gameWorldService, materialEditorEntity);
      if (entity) {
        MaterialApplicationService.applyMaterialToEntity(entity, currentEntityMaterial);
      }
    }
    onClose();
  };

  const handleApply = async () => {
    if (!editingMaterial || !materialEditorEntity || !gameWorldService) {
      onClose();
      return;
    }

    // Get the entity from the game world
    const entity = EntityLookupService.getEntityById(gameWorldService, materialEditorEntity);
    if (!entity) {
      console.error('Entity not found:', materialEditorEntity);
      onClose();
      return;
    }

    // Apply the material to the entity
    const success = await MaterialApplicationService.applyMaterialToEntity(entity, editingMaterial);
    if (success) {
    } else {
      console.error('Failed to apply material');
    }
    
    onClose();
  };

  if (!open) return null;

  const getCurrentMaterialInfo = () => {
    if (currentEntityMaterial) {
      return `Current: ${currentEntityMaterial.name}`;
    }
    return "No material assigned";
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={dialogRef}
        className="absolute bg-gray-900 border border-gray-800 rounded-xl shadow-2xl pointer-events-auto w-[1200px] h-[800px] flex flex-col overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'default',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-white">Material Editor</h2>
            <p className="text-sm text-gray-400 mt-0.5">{getCurrentMaterialInfo()}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Material Library */}
          <div className="w-80 border-r border-gray-800 bg-gray-950/50 flex flex-col">
            <MaterialLibrary
              selectedMaterial={selectedMaterial}
              onMaterialSelect={handleMaterialSelect}
            />
          </div>

          {/* Center Panel - Properties */}
          <div className="flex-1 flex flex-col bg-gray-950/30">
            <div className="flex-1 overflow-y-auto">
              {editingMaterial && (
                <MaterialProperties
                  material={editingMaterial}
                  onChange={handleMaterialChange}
                />
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-80 border-l border-gray-800 bg-gray-950/50 flex flex-col">
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Preview</h3>
              <div className="bg-black/30 rounded-lg p-4">
                <MaterialPreview
                  material={editingMaterial}
                  size={240}
                />
              </div>
              
              {/* Preview Options */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Preview Mesh</span>
                  <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300">
                    <option>Sphere</option>
                    <option>Cube</option>
                    <option>Torus</option>
                    <option>Plane</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Environment</span>
                  <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300">
                    <option>Studio</option>
                    <option>Outdoor</option>
                    <option>Night</option>
                    <option>None</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="text-xs text-gray-500">
            Tip: Drag and drop images onto texture slots to import them
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-gray-700 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Apply Material
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 