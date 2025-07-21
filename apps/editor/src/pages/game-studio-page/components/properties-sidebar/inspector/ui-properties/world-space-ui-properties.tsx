import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WorldSpaceUI } from "@/models";
import * as THREE from "three/webgpu";

interface WorldSpaceUIPropertiesProps {
  entity: WorldSpaceUI;
}

export function WorldSpaceUIProperties({ entity }: WorldSpaceUIPropertiesProps) {
  const [content, setContent] = useState(() => {
    // Read from entity config instead of DOM element
    return (entity as any).config?.content || "";
  });
  
  const [position, setPosition] = useState(() => {
    return {
      x: entity.position.x,
      y: entity.position.y,
      z: entity.position.z,
    };
  });
  
  const [billboarding, setBillboarding] = useState(() => {
    return (entity as any).config?.billboarding ?? false;
  });
  
  const [distanceScaling, setDistanceScaling] = useState(() => {
    return (entity as any).config?.distanceScaling ?? false;
  });
  
  const [occlusionTesting, setOcclusionTesting] = useState(() => {
    return (entity as any).config?.occlusionTesting ?? false;
  });
  
  const [maxDistance, setMaxDistance] = useState(() => {
    return (entity as any).config?.maxDistance ?? 50;
  });
  
  const [minDistance, setMinDistance] = useState(() => {
    return (entity as any).config?.minDistance ?? 0;
  });
  
  const [interactive, setInteractive] = useState(() => {
    return (entity as any).config?.interactive ?? true;
  });

  const handleContentChange = () => {
    entity.setContent(content);
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    
    const vec3Position = new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z);
    entity.setUIPosition(vec3Position);
  };

  const handleBillboardingChange = (checked: boolean) => {
    setBillboarding(checked);
    entity.setBillboarding(checked);
  };

  const handleDistanceScalingChange = (checked: boolean) => {
    setDistanceScaling(checked);
    entity.setDistanceScaling(checked);
  };

  const handleOcclusionTestingChange = (checked: boolean) => {
    setOcclusionTesting(checked);
    entity.setOcclusionTesting(checked);
  };

  const handleMaxDistanceChange = (value: number) => {
    setMaxDistance(value);
    entity.setDistanceRange(minDistance, value);
  };

  const handleMinDistanceChange = (value: number) => {
    setMinDistance(value);
    entity.setDistanceRange(value, maxDistance);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="worldui-content" className="text-sm font-medium text-gray-300">
          Content (HTML)
        </Label>
        <Textarea
          id="worldui-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleContentChange}
          placeholder="Enter HTML content..."
          className="min-h-[100px] bg-gray-800 border-gray-600 text-white"
        />
        <Button
          onClick={handleContentChange}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Apply Content
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-300">
          World Position
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="pos-x" className="text-xs text-gray-400">X</Label>
            <Input
              id="pos-x"
              type="number"
              value={position.x}
              onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="pos-y" className="text-xs text-gray-400">Y</Label>
            <Input
              id="pos-y"
              type="number"
              value={position.y}
              onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="pos-z" className="text-xs text-gray-400">Z</Label>
            <Input
              id="pos-z"
              type="number"
              value={position.z}
              onChange={(e) => handlePositionChange('z', parseFloat(e.target.value) || 0)}
              step="0.1"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="billboarding" className="text-sm font-medium text-gray-300">
            Billboarding
          </Label>
          <Switch
            id="billboarding"
            checked={billboarding}
            onCheckedChange={handleBillboardingChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="distance-scaling" className="text-sm font-medium text-gray-300">
            Distance Scaling
          </Label>
          <Switch
            id="distance-scaling"
            checked={distanceScaling}
            onCheckedChange={handleDistanceScalingChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="occlusion-testing" className="text-sm font-medium text-gray-300">
            Occlusion Testing
          </Label>
          <Switch
            id="occlusion-testing"
            checked={occlusionTesting}
            onCheckedChange={handleOcclusionTestingChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="interactive-worldui" className="text-sm font-medium text-gray-300">
            Interactive
          </Label>
          <Switch
            id="interactive-worldui"
            checked={interactive}
            onCheckedChange={setInteractive}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min-distance" className="text-sm font-medium text-gray-300">
            Min Distance
          </Label>
          <Input
            id="min-distance"
            type="number"
            value={minDistance}
            onChange={(e) => handleMinDistanceChange(parseFloat(e.target.value) || 0)}
            min="0"
            step="1"
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-distance" className="text-sm font-medium text-gray-300">
            Max Distance
          </Label>
          <Input
            id="max-distance"
            type="number"
            value={maxDistance}
            onChange={(e) => handleMaxDistanceChange(parseFloat(e.target.value) || 50)}
            min="1"
            step="1"
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </div>

      <div className="text-xs text-gray-400 p-2 bg-gray-800/50 rounded">
        <p><strong>Tips:</strong></p>
        <ul className="mt-1 space-y-1">
          <li>• Billboarding makes the UI always face the camera</li>
          <li>• Distance scaling adjusts size based on camera distance</li>
          <li>• Occlusion testing hides UI when blocked by objects</li>
        </ul>
      </div>
    </div>
  );
}
