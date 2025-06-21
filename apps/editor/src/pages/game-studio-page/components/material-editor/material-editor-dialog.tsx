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
      console.log('Material applied successfully');
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
        className="absolute bg-zinc-900/70 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl pointer-events-auto min-w-[800px] min-h-[600px] flex flex-col"
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between p-4 border-b border-gray-700/50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-white">Material Editor</h2>
            <p className="text-xs text-gray-400">{getCurrentMaterialInfo()}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Material Library */}
          <div className="w-80 border-r border-gray-700/50 flex flex-col">
            <MaterialLibrary
              selectedMaterial={selectedMaterial}
              onMaterialSelect={handleMaterialSelect}
            />
          </div>

          {/* Right Panel - Properties and Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Preview */}
            <div className="p-4 border-b border-gray-700/50">
              <MaterialPreview
                material={editingMaterial}
                size={200}
              />
            </div>

            {/* Properties */}
            <div className="flex-1 overflow-auto max-h-[500px]">
              {editingMaterial && (
                <MaterialProperties
                  material={editingMaterial}
                  onChange={handleMaterialChange}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700/50">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Material
          </Button>
        </div>
      </div>
    </div>
  );
} 