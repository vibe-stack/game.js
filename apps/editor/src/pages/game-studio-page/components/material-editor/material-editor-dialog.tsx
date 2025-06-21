import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaterialLibrary } from "./material-library";
import { MaterialProperties } from "./material-properties";
import { MaterialPreview } from "./material-preview";
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
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { materialEditorEntity } = useGameStudioStore();

  // Initialize with default material if none selected
  useEffect(() => {
    if (open && !selectedMaterial) {
      const defaultMaterials = materialSystem.getAllMaterialDefinitions();
      if (defaultMaterials.length > 0) {
        setSelectedMaterial(defaultMaterials[0]);
        setEditingMaterial({ ...defaultMaterials[0] });
      }
    }
  }, [open, selectedMaterial]);

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
  };

  const handleCancel = () => {
    setSelectedMaterial(null);
    setEditingMaterial(null);
    onClose();
  };

  const handleApply = () => {
    if (!editingMaterial || !materialEditorEntity) {
      onClose();
      return;
    }

    // TODO: Apply material to entity
    // This would involve getting the entity and setting its material
    
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={dialogRef}
        className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-2xl pointer-events-auto min-w-[800px] min-h-[600px] flex flex-col"
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
          <h2 className="text-lg font-semibold text-white">Material Editor</h2>
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