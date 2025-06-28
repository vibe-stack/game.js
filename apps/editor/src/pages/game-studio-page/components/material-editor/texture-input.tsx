import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Link, Unlink, FileImage, FolderOpen, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragInput } from "@/components/ui/drag-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";
import useGameStudioStore from "@/stores/game-studio-store";

interface AssetReference {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  created: string;
  modified: string;
}

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
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [projectAssets, setProjectAssets] = useState<AssetReference[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
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

  // Load project assets when browser opens
  const loadProjectAssets = useCallback(async () => {
    if (!currentProject) return;
    
    setLoadingAssets(true);
    try {
      const assets = await window.projectAPI.getAssets(currentProject.path);
      // Filter for texture/image assets
      const textureAssets = assets.filter((asset: AssetReference) => 
        asset.type === 'texture' || 
        /\.(jpg|jpeg|png|webp|bmp|tga|hdr|exr)$/i.test(asset.path)
      );
      setProjectAssets(textureAssets);
    } catch (error) {
      console.error('Failed to load project assets:', error);
    }
    setLoadingAssets(false);
  }, [currentProject]);

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

  const handleBrowseAssets = () => {
    loadProjectAssets();
    setShowAssetBrowser(true);
  };

  const handleAssetSelect = (asset: AssetReference) => {
    onChange(asset.path);
    setShowAssetBrowser(false);
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

  const AssetBrowserDialog = () => (
    <Dialog open={showAssetBrowser} onOpenChange={setShowAssetBrowser}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Existing Texture</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-96">
          {loadingAssets ? (
            <div className="p-8 text-center text-gray-400">
              Loading textures...
            </div>
          ) : projectAssets.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No textures found in project.
              <br />
              Import some textures first.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-4">
              {projectAssets.map((asset) => (
                <AssetItem
                  key={asset.id}
                  asset={asset}
                  onSelect={() => handleAssetSelect(asset)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  const AssetItem = ({ asset, onSelect }: { asset: AssetReference; onSelect: () => void }) => {
    const [assetPreview, setAssetPreview] = useState<string | null>(null);

    React.useEffect(() => {
      if (currentProject) {
        window.projectAPI.getAssetUrl(currentProject.path, asset.path).then(url => {
          setAssetPreview(url);
        });
      }
    }, [asset.path]);

    return (
      <div 
        className="border border-gray-700 rounded-lg p-2 hover:border-emerald-500 cursor-pointer transition-colors"
        onClick={onSelect}
      >
        <div className="aspect-square bg-gray-800 rounded mb-2 overflow-hidden">
          {assetPreview ? (
            <img 
              src={assetPreview} 
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>
        <div className="text-xs text-gray-300 truncate" title={asset.name}>
          {asset.name}
        </div>
      </div>
    );
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

      {/* Browse existing assets button */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBrowseAssets}
          className="flex-1 h-8 text-xs border-gray-700 hover:bg-gray-800"
        >
          <FolderOpen className="w-3 h-3 mr-1" />
          Browse Existing
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          className="flex-1 h-8 text-xs border-gray-700 hover:bg-gray-800"
        >
          <Upload className="w-3 h-3 mr-1" />
          Import New
        </Button>
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
                compact
              />
              <DragInput
                label="Y"
                value={uvScale.y}
                onChange={(v) => handleUVScaleChange('y', v)}
                step={0.01}
                precision={2}
                compact
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
                compact
              />
              <DragInput
                label="Y"
                value={uvOffset.y}
                onChange={(v) => onUVChange({ offset: { ...uvOffset, y: v } })}
                step={0.01}
                precision={2}
                compact
              />
            </div>
          </div>

          {/* UV Rotation */}
          <div className="space-y-1">
            <DragInput
              label="UV Rotation"
              value={uvRotation}
              onChange={(v) => onUVChange({ rotation: v })}
              step={0.01}
              precision={2}
              compact
            />
          </div>
        </div>
      )}

      <AssetBrowserDialog />
    </div>
  );
} 