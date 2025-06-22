import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface EntityInfoProps {
  entityName: string;
  entityType: string;
  visible: boolean;
  onNameChange: (name: string) => void;
  onVisibilityChange: (visible: boolean) => void;
}

export function EntityInfo({
  entityName,
  entityType,
  visible,
  onNameChange,
  onVisibilityChange,
}: EntityInfoProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">Entity Info</h3>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-gray-300 text-xs">Name</Label>
          <Input 
            value={entityName} 
            onChange={(e) => onNameChange(e.target.value)}
            readOnly
            className="bg-white/5 border-white/20 text-white text-sm h-8" 
            placeholder="Entity name is read-only"
          />
        </div>
        
        <div className="space-y-1">
          <Label className="text-gray-300 text-xs">Type</Label>
          <span className="text-muted-foreground text-xs">{entityType}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="visible"
            checked={visible}
            onCheckedChange={onVisibilityChange}
            className="border-white/20 data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
          />
          <Label htmlFor="visible" className="text-gray-300 text-xs">Visible</Label>
        </div>
      </div>
    </div>
  );
} 