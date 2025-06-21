import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialCreationService } from "./material-creation-service";
import { MaterialDefinition } from "@/types/project";

interface CreateMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMaterialCreated: (material: MaterialDefinition) => void;
}

export function CreateMaterialDialog({ 
  isOpen, 
  onClose, 
  onMaterialCreated 
}: CreateMaterialDialogProps) {
  const [materialName, setMaterialName] = useState("");
  const [materialType, setMaterialType] = useState<"basic" | "lambert" | "phong" | "standard" | "physical" | "toon">("standard");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!materialName.trim()) return;

    setIsCreating(true);
    try {
      // Create new material
      const newMaterial = MaterialCreationService.createNewMaterial(
        materialName.trim(),
        materialType,
        "custom"
      );

      // Add to material system
      MaterialCreationService.addMaterialToSystem(newMaterial);

      // Notify parent
      onMaterialCreated(newMaterial);

      // Reset form and close
      setMaterialName("");
      setMaterialType("standard");
      onClose();
    } catch (error) {
      console.error("Failed to create material:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setMaterialName("");
    setMaterialType("standard");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-white mb-4">Create New Material</h3>
        
        <div className="space-y-4">
          {/* Material Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Material Name</label>
            <Input
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="Enter material name"
              className="w-full"
            />
          </div>

          {/* Material Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Material Type</label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-white"
            >
              <option value="basic">Basic</option>
              <option value="lambert">Lambert</option>
              <option value="phong">Phong</option>
              <option value="standard">Standard (PBR)</option>
              <option value="physical">Physical (Advanced PBR)</option>
              <option value="toon">Toon</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!materialName.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create Material"}
          </Button>
        </div>
      </div>
    </div>
  );
} 