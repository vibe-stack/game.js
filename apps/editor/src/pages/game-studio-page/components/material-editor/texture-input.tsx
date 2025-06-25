import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Link, Unlink, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragInput } from "@/components/ui/drag-input";
import { cn } from "@/utils/tailwind";
import useGameStudioStore from "@/stores/game-studio-store";

interface TextureInputProps {
  label: string;
  value?: string; // Asset path reference
  uvScale?: { x: number; y: number };
  uvOffset?: { x: number; y: number };
  uvRotation?: number;
  onChange: (assetPath: string | undefined) => void;
  onUVChange?: (uv: { scale?: { x: number; y: number }; offset?: { x: number; y: number }; rotation?: number }) => void;
  className?: string;
}

export function TextureInput({
  label,
  value,
  uvScale = { x: 1, y: 1 },
  uvOffset = { x: 0, y: 0 },
  uvRotation = 0,
  onChange,
  onUVChange,
  className
}: TextureInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uvLocked, setUVLocked] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentProject } = useGameStudioStore();

  // Load texture preview
  React.useEffect(() => {
    if (value && currentProject) {
      window.projectAPI.getAssetUrl(currentProject.path, value).then(url => {
        setPreviewUrl(url);
      });
    } else {
      setPreviewUrl(null);
    }
  }, [value, currentProject]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!currentProject) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => 
      file.type.startsWith('image/') || 
      /\.(jpg|jpeg|png|webp|bmp|tga|hdr|exr)$/i.test(file.name)
    );

    if (imageFile) {
      try {
        const arrayBuffer = await imageFile.arrayBuffer();
        const asset = await window.projectAPI.importAssetFromData(
          currentProject.path,
          imageFile.name,
          arrayBuffer
        );
        
        onChange(asset.path);
      } catch (error) {
        console.error('Failed to import texture:', error);
      }
    }
  }, [currentProject, onChange]);

  const handleFileSelect = async () => {
    if (!currentProject) return;

    const files = await window.projectAPI.selectAssetFiles();
    if (files.length > 0) {
      const imageFile = files.find(file => 
        /\.(jpg|jpeg|png|webp|bmp|tga|hdr|exr)$/i.test(file)
      );

      if (imageFile) {
        try {
          const asset = await window.projectAPI.importAsset(currentProject.path, imageFile);
          onChange(asset.path);
        } catch (error) {
          console.error('Failed to import texture:', error);
        }
      }
    }
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const handleUVScaleChange = (axis: 'x' | 'y', value: number) => {
    if (uvLocked) {
      onUVChange?.({ scale: { x: value, y: value } });
    } else {
      onUVChange?.({ scale: { ...uvScale, [axis]: value } });
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Texture slot header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">{label}</label>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-5 w-5 p-0 hover:bg-red-500/20"
          >
            <X className="w-3 h-3 text-red-400" />
          </Button>
        )}
      </div>

      {/* Texture preview/drop zone */}
      <div
        className={cn(
          "relative group rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          isDragging ? "border-emerald-500 bg-emerald-500/10" : "border-gray-700 hover:border-gray-600",
          value ? "bg-gray-800/50" : "bg-gray-900/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.hdr,.exr"
          onChange={() => {}}
          className="hidden"
        />
        
        {value && previewUrl ? (
          <div className="relative h-24 w-full">
            <img 
              src={previewUrl} 
              alt={label}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div className="h-24 flex flex-col items-center justify-center text-gray-500">
            <FileImage className="w-6 h-6 mb-1" />
            <span className="text-xs">Drop texture or click to browse</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
          <Upload className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* UV Controls - only show when texture is assigned */}
      {value && onUVChange && (
        <div className="space-y-2 pt-2 border-t border-gray-800">
          {/* UV Scale */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">UV Scale</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUVLocked(!uvLocked)}
                className="h-5 w-5 p-0 hover:bg-gray-700"
              >
                {uvLocked ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DragInput
                label="X"
                value={uvScale.x}
                onChange={(v) => handleUVScaleChange('x', v)}
                step={0.01}
                precision={2}
                min={0.01}
                max={10}
                compact
              />
              <DragInput
                label="Y"
                value={uvScale.y}
                onChange={(v) => handleUVScaleChange('y', v)}
                step={0.01}
                precision={2}
                min={0.01}
                max={10}
                compact
                disabled={uvLocked}
              />
            </div>
          </div>

          {/* UV Offset */}
          <div className="space-y-1">
            <span className="text-xs text-gray-400">UV Offset</span>
            <div className="grid grid-cols-2 gap-2">
              <DragInput
                label="X"
                value={uvOffset.x}
                onChange={(v) => onUVChange({ offset: { ...uvOffset, x: v } })}
                step={0.01}
                precision={2}
                min={-10}
                max={10}
                compact
              />
              <DragInput
                label="Y"
                value={uvOffset.y}
                onChange={(v) => onUVChange({ offset: { ...uvOffset, y: v } })}
                step={0.01}
                precision={2}
                min={-10}
                max={10}
                compact
              />
            </div>
          </div>

          {/* UV Rotation */}
          <DragInput
            label="Rotation"
            value={uvRotation}
            onChange={(v) => onUVChange({ rotation: v })}
            step={1}
            precision={0}
            min={-180}
            max={180}
            suffix="°"
            compact
          />
        </div>
      )}
    </div>
  );
} 