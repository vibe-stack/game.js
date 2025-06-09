import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CollisionGroupsGridProps {
  value: CollisionGroups;
  onChange: (groups: CollisionGroups) => void;
  label: string;
}

export default function CollisionGroupsGrid({ value, onChange, label }: CollisionGroupsGridProps) {
  const toggleBit = (currentValue: number, bitIndex: number): number => {
    const mask = 1 << bitIndex;
    return currentValue ^ mask;
  };

  const isBitSet = (value: number, bitIndex: number): boolean => {
    return (value & (1 << bitIndex)) !== 0;
  };

  const toggleMembership = (bitIndex: number) => {
    onChange({
      ...value,
      membership: toggleBit(value.membership, bitIndex)
    });
  };

  const toggleFilter = (bitIndex: number) => {
    onChange({
      ...value,
      filter: toggleBit(value.filter, bitIndex)
    });
  };

  // Create 2x8 grid for 16 collision groups (0-15)
  const renderGrid = (bitmask: number, onToggle: (bitIndex: number) => void) => {
    const buttons = [];
    
    for (let row = 0; row < 2; row++) {
      const rowButtons = [];
      for (let col = 0; col < 8; col++) {
        const bitIndex = row * 8 + col;
        const isActive = isBitSet(bitmask, bitIndex);
        
        rowButtons.push(
          <Button
            key={bitIndex}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="w-4 h-4 rounded-none p-0 text-xs"
            onClick={() => onToggle(bitIndex)}
          >
          </Button>
        );
      }
      buttons.push(
        <div key={row} className="flex space-x-1">
          {rowButtons}
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {buttons}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground/50">Membership</Label>
          {renderGrid(value.membership, toggleMembership)}
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground/50">Filter</Label>
          {renderGrid(value.filter, toggleFilter)}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <div>Membership: 0x{value.membership.toString(16).toUpperCase().padStart(4, '0')}</div>
        <div>Filter: 0x{value.filter.toString(16).toUpperCase().padStart(4, '0')}</div>
      </div>
    </div>
  );
} 