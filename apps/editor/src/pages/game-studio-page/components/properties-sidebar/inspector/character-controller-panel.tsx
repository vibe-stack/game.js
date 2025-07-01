import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Entity } from "@/models";
import { CharacterControllerProperties } from "./character-controller-properties";

interface CharacterControllerPanelProps {
  entity: Entity;
  open: boolean;
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = "character-controller-panel-position";

export function CharacterControllerPanel({ entity, open, onClose }: CharacterControllerPanelProps) {
  const [position, setPosition] = useState<Position>(() => {
    try {
      const savedPosition = localStorage.getItem(STORAGE_KEY);
      if (savedPosition) {
        return JSON.parse(savedPosition);
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return { x: 100, y: 100 };
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure position is within viewport bounds
  const validatePosition = useCallback((pos: Position): Position => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const panelWidth = 600; // Width of the panel
    const panelHeight = 300; // Approximate minimum height to ensure it's accessible
    
    return {
      x: Math.min(Math.max(pos.x, 0), windowWidth - 100),
      y: Math.min(Math.max(pos.y, 0), windowHeight - 100),
    };
  }, []);

  // Load position from localStorage and validate it on mount and when window is resized
  useEffect(() => {
    const handleResize = () => {
      setPosition((prevPos: Position) => {
        const validatedPos = validatePosition(prevPos);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedPos));
        return validatedPos;
      });
    };

    // Validate initial position
    setPosition((prevPos: Position) => validatePosition(prevPos));
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [validatePosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPos = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      setPosition(newPos);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Save position to localStorage when drag ends
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      setIsDragging(false);
    }
  }, [isDragging, position]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bg-background/50 backdrop-blur-lg border rounded-lg shadow-2xl z-50 select-none flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: 600,
        maxHeight: '80vh',
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b"
        onMouseDown={handleMouseDown}
      >
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Character Controller</h2>
          <p className="text-sm text-muted-foreground">
            Configure movement, physics, and camera settings
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 64px)' }}>
        <CharacterControllerProperties entity={entity} />
      </div>
    </div>
  );
} 