import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Overlay, WorldSpaceUI, UIAnchor } from "@/models";
import * as THREE from "three/webgpu";

interface OverlayPropertiesProps {
  entity: Overlay;
}

export function OverlayProperties({ entity }: OverlayPropertiesProps) {
  const [content, setContent] = useState(() => {
    // Read from entity config instead of DOM element
    return (entity as any).config?.content || "";
  });
  
  const [anchor, setAnchor] = useState<UIAnchor>(() => {
    // Get current anchor from entity config
    return (entity as any).config?.anchor || "top-left";
  });
  
  const [offset, setOffset] = useState(() => {
    return (entity as any).config?.offset || { x: 0, y: 0 };
  });
  
  const [interactive, setInteractive] = useState(() => {
    return (entity as any).config?.interactive ?? true;
  });
  
  const [autoHide, setAutoHide] = useState(() => {
    return (entity as any).config?.autoHide ?? false;
  });
  
  const [autoHideDelay, setAutoHideDelay] = useState(() => {
    return (entity as any).config?.autoHideDelay ?? 3000;
  });
  
  const [followMouse, setFollowMouse] = useState(() => {
    return (entity as any).config?.followMouse ?? false;
  });

  // Sync state with entity when entity changes
  useEffect(() => {
    const entityConfig = (entity as any).config;
    if (entityConfig) {
      setContent(entityConfig.content || "");
      setAnchor(entityConfig.anchor || "top-left");
      setOffset(entityConfig.offset || { x: 0, y: 0 });
      setInteractive(entityConfig.interactive ?? true);
      setAutoHide(entityConfig.autoHide ?? false);
      setAutoHideDelay(entityConfig.autoHideDelay ?? 3000);
      setFollowMouse(entityConfig.followMouse ?? false);
    }
  }, [entity]);

  const handleContentChange = () => {
    entity.setContent(content);
    // Force a small state update to ensure persistence
    console.log("Content updated:", content);
  };

  const handleAnchorChange = (value: UIAnchor) => {
    setAnchor(value);
    entity.setAnchor(value);
  };

  const handleOffsetChange = (axis: 'x' | 'y', value: number) => {
    const newOffset = { ...offset, [axis]: value };
    setOffset(newOffset);
    entity.setOffset(newOffset);
  };

  const handleInteractiveChange = (checked: boolean) => {
    setInteractive(checked);
    // Note: Interactive state is set at creation time, would need to recreate element
    // For now, just update the state
  };

  const handleAutoHideChange = (checked: boolean) => {
    setAutoHide(checked);
    entity.setAutoHide(checked, autoHideDelay);
  };

  const handleAutoHideDelayChange = (value: number) => {
    setAutoHideDelay(value);
    entity.setAutoHide(autoHide, value);
  };

  const handleFollowMouseChange = (checked: boolean) => {
    setFollowMouse(checked);
    entity.setFollowMouse(checked);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="overlay-content" className="text-sm font-medium text-gray-300">
          Content (HTML)
        </Label>
        <Textarea
          id="overlay-content"
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
        <Label htmlFor="overlay-anchor" className="text-sm font-medium text-gray-300">
          Anchor Position
        </Label>
        <Select value={anchor} onValueChange={handleAnchorChange}>
          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="top-left">Top Left</SelectItem>
            <SelectItem value="top-center">Top Center</SelectItem>
            <SelectItem value="top-right">Top Right</SelectItem>
            <SelectItem value="center-left">Center Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="center-right">Center Right</SelectItem>
            <SelectItem value="bottom-left">Bottom Left</SelectItem>
            <SelectItem value="bottom-center">Bottom Center</SelectItem>
            <SelectItem value="bottom-right">Bottom Right</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="offset-x" className="text-sm font-medium text-gray-300">
            Offset X
          </Label>
          <Input
            id="offset-x"
            type="number"
            value={offset.x}
            onChange={(e) => handleOffsetChange('x', parseFloat(e.target.value) || 0)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="offset-y" className="text-sm font-medium text-gray-300">
            Offset Y
          </Label>
          <Input
            id="offset-y"
            type="number"
            value={offset.y}
            onChange={(e) => handleOffsetChange('y', parseFloat(e.target.value) || 0)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="interactive" className="text-sm font-medium text-gray-300">
            Interactive
          </Label>
          <Switch
            id="interactive"
            checked={interactive}
            onCheckedChange={handleInteractiveChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="follow-mouse" className="text-sm font-medium text-gray-300">
            Follow Mouse
          </Label>
          <Switch
            id="follow-mouse"
            checked={followMouse}
            onCheckedChange={handleFollowMouseChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="auto-hide" className="text-sm font-medium text-gray-300">
            Auto Hide
          </Label>
          <Switch
            id="auto-hide"
            checked={autoHide}
            onCheckedChange={handleAutoHideChange}
          />
        </div>

        {autoHide && (
          <div className="space-y-2">
            <Label htmlFor="auto-hide-delay" className="text-sm font-medium text-gray-300">
              Auto Hide Delay (ms)
            </Label>
            <Input
              id="auto-hide-delay"
              type="number"
              value={autoHideDelay}
              onChange={(e) => handleAutoHideDelayChange(parseInt(e.target.value) || 3000)}
              min="100"
              step="100"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
