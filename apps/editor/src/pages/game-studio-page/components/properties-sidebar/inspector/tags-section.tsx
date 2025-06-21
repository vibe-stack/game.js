import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface TagsSectionProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagsSection({ tags, onTagsChange }: TagsSectionProps) {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">Tags</h3>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Add tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-white/5 border-white/20 text-white text-sm h-8 flex-1"
          />
          <Button
            onClick={handleAddTag}
            disabled={!newTag.trim() || tags.includes(newTag.trim())}
            size="sm"
            className="h-8 px-2 bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/30"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <span 
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-lime-500/20 text-lime-300 text-xs rounded border border-lime-500/30"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-gray-400 text-xs">No tags</span>
          )}
        </div>
      </div>
    </div>
  );
} 