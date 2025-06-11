import React, { useEffect, useState } from "react";
import { Upload, Trash2, Plus, Image, Box, Music, FileCode, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useEditorStore from "@/stores/editor-store";

interface AssetsPanelProps {
  scene: GameScene | null;
}

export default function AssetsPanel({ scene }: AssetsPanelProps) {
  const { 
    assets, 
    currentProject,
    loadAssets, 
    importAsset, 
    deleteAsset, 
    createMeshFromGLB 
  } = useEditorStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<'all' | AssetReference['type']>('all');

  useEffect(() => {
    if (currentProject) {
      loadAssets();
    }
  }, [currentProject, loadAssets]);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedAssetType === 'all' || asset.type === selectedAssetType;
    return matchesSearch && matchesType;
  });

  const handleUploadAssets = async () => {
    try {
      const filePaths = await window.projectAPI.selectAssetFiles();
      
      for (const filePath of filePaths) {
        try {
          await importAsset(filePath);
        } catch (error) {
          console.error('Failed to import asset:', error);
        }
      }
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      await deleteAsset(assetId);
    }
  };

  const handleCreateMeshFromAsset = (asset: AssetReference) => {
    if (asset.type === 'model') {
      createMeshFromGLB(asset);
    }
  };

  const getAssetIcon = (type: AssetReference['type']) => {
    switch (type) {
      case 'texture': return <Image className="h-4 w-4" />;
      case 'model': return <Box className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'script': return <FileCode className="h-4 w-4" />;
      case 'shader': return <Palette className="h-4 w-4" />;
      case 'material': return <Palette className="h-4 w-4" />;
      default: return <FileCode className="h-4 w-4" />;
    }
  };

  const getAssetTypeColor = (type: AssetReference['type']) => {
    switch (type) {
      case 'texture': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'model': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'audio': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'script': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'shader': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'material': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!scene) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No scene loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Project Assets</h3>
          <Button onClick={handleUploadAssets} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
        
        {/* Search */}
        <Input
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3"
        />
        
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1">
          {(['all', 'texture', 'model', 'audio', 'script', 'shader', 'material'] as const).map(type => (
            <Button
              key={type}
              variant={selectedAssetType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAssetType(type)}
              className="text-xs h-6"
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredAssets.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            {assets.length === 0 
              ? "No assets yet. Upload your first asset!" 
              : "No assets match your search."}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAssets.map(asset => (
              <Card key={asset.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{asset.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {asset.path}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className={`text-xs ${getAssetTypeColor(asset.type)}`}>
                            {asset.type}
                          </Badge>
                          {asset.type === 'model' && (
                            <Button
                              onClick={() => handleCreateMeshFromAsset(asset)}
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Create Mesh
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteAsset(asset.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0 ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 