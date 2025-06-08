import React, { useState } from "react";
import { Eye, EyeOff, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ObjectHeaderProps {
  object: GameObject;
  onUpdate: (updates: Partial<GameObject>) => void;
}

export default function ObjectHeader({ object, onUpdate }: ObjectHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(object.name);

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== object.name) {
      onUpdate({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(object.name);
    setIsEditingName(false);
  };

  const handleVisibilityToggle = () => {
    onUpdate({ visible: !object.visible });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') handleNameCancel();
            }}
            className="h-7 text-sm"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h3 className="text-sm font-medium text-white">{object.name}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingName(true)}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVisibilityToggle}
          className="h-6 w-6 p-0"
        >
          {object.visible ? (
            <Eye className="h-3 w-3 text-green-400" />
          ) : (
            <EyeOff className="h-3 w-3 text-gray-500" />
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        ID: {object.id}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="visible"
          checked={object.visible}
          onCheckedChange={(value: boolean) => onUpdate({ visible: value })}
        />
        <Label htmlFor="visible" className="text-xs">Visible</Label>
      </div>

      {object.tags.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Tags:</div>
          <div className="flex flex-wrap gap-1">
            {object.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-muted/50 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 