import React, { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MaterialDefinition } from "@/types/project";
import { materialSystem } from "@/services/material-system";
import { CreateMaterialDialog } from "./create-material-dialog";

interface MaterialLibraryProps {
  selectedMaterial: MaterialDefinition | null;
  onMaterialSelect: (material: MaterialDefinition) => void;
}

export function MaterialLibrary({ selectedMaterial, onMaterialSelect }: MaterialLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const allMaterials = useMemo(() => {
    return materialSystem.getAllMaterialDefinitions();
  }, [refreshKey]);

  const categories = useMemo(() => {
    const cats = new Set(allMaterials.map(m => m.metadata.category));
    return Array.from(cats).sort();
  }, [allMaterials]);

  const filteredMaterials = useMemo(() => {
    return allMaterials.filter(material => {
      const matchesSearch = searchQuery === "" || 
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.metadata.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesCategory = selectedCategory === "all" || 
        material.metadata.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [allMaterials, searchQuery, selectedCategory]);

  const handleCreateMaterial = () => {
    setShowCreateDialog(true);
  };

  const handleMaterialCreated = (newMaterial: MaterialDefinition) => {
    // Refresh the materials list and select the new material
    setRefreshKey(prev => prev + 1);
    onMaterialSelect(newMaterial);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Create */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCreateMaterial}
            className="px-3"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-white"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Material List */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-1 p-2">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                selectedMaterial?.id === material.id
                  ? "bg-blue-600/20 border border-blue-500"
                  : "hover:bg-gray-700/50"
              }`}
              onClick={() => onMaterialSelect(material)}
            >
              <div className="text-sm font-medium text-white">
                {material.name}
              </div>
              {material.description && (
                <div className="text-xs text-gray-400 mt-1">
                  {material.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                  {material.type}
                </span>
                <span className="text-xs text-gray-500">
                  {material.metadata.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredMaterials.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            {searchQuery ? "No materials found matching your search" : "No materials available"}
          </div>
        )}
      </div>

      <CreateMaterialDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onMaterialCreated={handleMaterialCreated}
      />
    </div>
  );
} 