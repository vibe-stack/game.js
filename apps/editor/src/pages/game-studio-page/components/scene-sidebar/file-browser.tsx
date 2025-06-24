import React, { useState, useCallback, useRef, useEffect } from "react";
import { Upload, FileText, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import * as THREE from "three/webgpu";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GameWorldService } from "../../services/game-world-service";
import { Mesh3D } from "@/models/primitives/mesh-3d";
import useGameStudioStore from "@/stores/game-studio-store";

interface FileBrowserProps {
  gameWorldService: React.RefObject<GameWorldService | null>;
}

interface FileItem {
  id: string;
  name: string;
  path: string; // Relative path in assets folder
  type: "glb";
  size: number;
  uploadedAt: Date;
}

export default function FileBrowser({ gameWorldService }: FileBrowserProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentProject } = useGameStudioStore();

  // Load existing GLB files from the project's assets folder
  useEffect(() => {
    if (currentProject) {
      loadProjectAssets();
    }
  }, [currentProject]);

  const loadProjectAssets = async () => {
    if (!currentProject) return;
    
    try {
      const assets = await window.projectAPI.getAssets(currentProject.path);
      const glbAssets = assets.filter(asset => 
        asset.path && asset.path.toLowerCase().endsWith('.glb')
      );
      
      const fileItems: FileItem[] = glbAssets.map(asset => ({
        id: asset.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: asset.name || asset.path.split('/').pop() || 'Unknown',
        path: asset.path,
        type: "glb" as const,
        size: asset.size || 0,
        uploadedAt: new Date(asset.uploadedAt || Date.now())
      }));
      
      setFiles(fileItems);
    } catch (error) {
      console.error("Failed to load project assets:", error);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await processFiles(droppedFiles);
  }, [currentProject]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await processFiles(selectedFiles);
    }
  }, [currentProject]);

  const processFiles = async (fileList: File[]) => {
    if (!currentProject) {
      toast.error("No project loaded");
      return;
    }

    const glbFiles = fileList.filter(file => 
      file.name.toLowerCase().endsWith('.glb')
    );

    if (glbFiles.length === 0) {
      toast.error("Please select GLB files only");
      return;
    }

    setLoading(true);
    for (const file of glbFiles) {
      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Import the asset to the project's assets folder
        const asset = await window.projectAPI.importAssetFromData(
          currentProject.path,
          file.name,
          arrayBuffer
        );
        
        // Create file item
        const fileItem: FileItem = {
          id: asset.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          path: asset.path, // This will be something like "assets/model.glb"
          type: "glb",
          size: file.size,
          uploadedAt: new Date()
        };

        setFiles(prev => [...prev, fileItem]);
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error(`Failed to process ${file.name}`);
      }
    }
    setLoading(false);
  };

  const handleAddToScene = useCallback(async (fileItem: FileItem) => {
    if (!gameWorldService.current || !currentProject) return;

    try {
      const gameWorld = gameWorldService.current.getGameWorld();
      if (!gameWorld) {
        throw new Error("Game world not initialized");
      }

      // Get the asset URL from the project API
      const assetUrl = await window.projectAPI.getAssetUrl(currentProject.path, fileItem.path);
      if (!assetUrl) {
        throw new Error("Failed to get asset URL");
      }

      // Load the GLB file using the URL
      const loader = new GLTFLoader();
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.load(assetUrl, resolve, undefined, reject);
      });

      // Find the first mesh in the loaded model
      let meshFound = false;
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && !meshFound) {
          meshFound = true;
          
          // Create a Mesh3D entity
          const mesh = new Mesh3D({
            name: fileItem.name.replace('.glb', ''),
            position: new THREE.Vector3(0, 2, 0),
            geometry: child.geometry,
            material: child.material,
            castShadow: true,
            receiveShadow: true,
          });

          // Store the model path for serialization
          mesh.metadata.modelPath = fileItem.path;

          // Add physics configuration
          mesh.physicsConfig = {
            type: "dynamic",
            mass: 1,
            restitution: 0.5,
            friction: 0.5
          };

          // Add to game world
          gameWorld.createEntity(mesh);

          // Select the new entity
          const selectionManager = gameWorldService.current.getSelectionManager();
          selectionManager.onEntityAdded(mesh);
          selectionManager.selectEntity(mesh.entityId);

          toast.success(`Added ${fileItem.name} to scene`);
        }
      });

      if (!meshFound) {
        throw new Error("No mesh found in GLB file");
      }
    } catch (error) {
      console.error("Failed to add mesh to scene:", error);
      toast.error(`Failed to add ${fileItem.name} to scene`);
    }
  }, [gameWorldService, currentProject]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!currentProject) return;
    
    const file = files.find(f => f.id === fileId);
    if (file) {
      try {
        await window.projectAPI.deleteAsset(currentProject.path, fileId);
        setFiles(prev => prev.filter(f => f.id !== fileId));
        toast.success(`Deleted ${file.name}`);
      } catch (error) {
        console.error("Failed to delete asset:", error);
        toast.error(`Failed to delete ${file.name}`);
      }
    }
  }, [files, currentProject]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload area */}
      <div
        className={`m-2 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragging
            ? "border-lime-400 bg-lime-400/10"
            : "border-white/20 hover:border-white/40"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-400 mb-2">
          Drag and drop GLB files here
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/10 hover:bg-white/20"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Browse Files"}
        </Button>
      </div>

      {/* File list */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {files.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              No GLB files in project assets
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedFile === file.id
                    ? "border-lime-400 bg-lime-400/10"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
                onClick={() => setSelectedFile(file.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <FileText className="h-4 w-4 mt-0.5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(file.size)} • {file.path}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToScene(file);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Actions for selected file */}
      {selectedFile && (
        <div className="p-2 border-t border-white/10">
          <Button
            size="sm"
            className="w-full bg-lime-500 hover:bg-lime-600 text-black"
            onClick={() => {
              const file = files.find(f => f.id === selectedFile);
              if (file) handleAddToScene(file);
            }}
          >
            Add to Scene
          </Button>
        </div>
      )}
    </div>
  );
} 