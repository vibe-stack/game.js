import React, { useState, useEffect } from "react";
import { Package, Upload, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three/webgpu";
import { Mesh3D } from "@/models/primitives/mesh-3d";
import { toast } from "sonner";
import useGameStudioStore from "@/stores/game-studio-store";

interface Mesh3DPropertiesProps {
  entity: Mesh3D;
}

export function Mesh3DProperties({ entity }: Mesh3DPropertiesProps) {
  const [loading, setLoading] = useState(false);
  const [hasModel, setHasModel] = useState(() => {
    const geometry = entity.getGeometry();
    return geometry ? geometry.attributes.position && geometry.attributes.position.count > 0 : false;
  });
  const [modelPath, setModelPath] = useState((entity.metadata as any).modelPath as string || "");
  const { currentProject } = useGameStudioStore();

  useEffect(() => {
    // Check if entity has a model loaded
    const geometry = entity.getGeometry();
    const loaded = geometry ? geometry.attributes.position && geometry.attributes.position.count > 0 : false;
    setHasModel(loaded);
    setModelPath((entity.metadata as any).modelPath as string || "");
  }, [entity]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.glb') || !currentProject) {
      toast.error("Please select a GLB file");
      return;
    }

    setLoading(true);
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Import the asset to the project's assets folder
      const asset = await window.projectAPI.importAssetFromData(
        currentProject.path,
        file.name,
        arrayBuffer
      );

      // Get the asset URL
      const assetUrl = await window.projectAPI.getAssetUrl(currentProject.path, asset.path);
      if (!assetUrl) {
        throw new Error("Failed to get asset URL");
      }

      // Load the model using the URL
      await entity.loadFromUrl(assetUrl);
      
      // Store the model path in metadata for serialization
      (entity.metadata as any).modelPath = asset.path;
      
      setHasModel(true);
      setModelPath(asset.path);
      toast.success("Model loaded successfully");
    } catch (error) {
      console.error("Failed to load model:", error);
      toast.error("Failed to load model");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModel = () => {
    const meshObj = entity.getMesh();
    if (meshObj && meshObj instanceof THREE.Mesh) {
      // Reset to empty geometry
      meshObj.geometry = new THREE.BufferGeometry();
      meshObj.material = new THREE.MeshStandardMaterial();
      (entity.metadata as any).modelPath = undefined;
      setHasModel(false);
      setModelPath("");
      toast.success("Model removed");
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lime-300 text-sm font-medium border-b border-white/10 pb-1">
        3D Mesh Properties
      </h3>

      <div className="space-y-4">
        {/* Model Loading */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-400">Model</Label>
          {modelPath && (
            <p className="text-xs text-gray-500 mb-1">Path: {modelPath}</p>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              accept=".glb"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="mesh-file-upload"
            />
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 bg-white/10 hover:bg-white/20"
              onClick={() => document.getElementById('mesh-file-upload')?.click()}
              disabled={loading}
            >
              <Upload className="h-3 w-3 mr-1" />
              {loading ? "Loading..." : hasModel ? "Replace GLB" : "Load GLB"}
            </Button>
            {hasModel && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-red-500/20 hover:bg-red-500/30"
                onClick={handleRemoveModel}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Rendering Options */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-300">Rendering</h4>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="cast-shadow" className="text-xs text-gray-400">
              Cast Shadow
            </Label>
            <Switch
              id="cast-shadow"
              checked={entity.castShadow}
              onCheckedChange={(checked) => {
                entity.castShadow = checked;
                const mesh = entity.getMesh();
                if (mesh) mesh.castShadow = checked;
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="receive-shadow" className="text-xs text-gray-400">
              Receive Shadow
            </Label>
            <Switch
              id="receive-shadow"
              checked={entity.receiveShadow}
              onCheckedChange={(checked) => {
                entity.receiveShadow = checked;
                const mesh = entity.getMesh();
                if (mesh) mesh.receiveShadow = checked;
              }}
            />
          </div>
        </div>

        {/* Model Info */}
        {hasModel && (
          <>
            <Separator className="bg-white/10" />
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-300">Model Info</h4>
              <div className="text-xs text-gray-500">
                <p>• Geometry loaded</p>
                {entity.physicsConfig && (
                  <>
                    <p>• Physics enabled ({entity.physicsConfig.type})</p>
                    <p>• Using convex hull collider</p>
                  </>
                )}
                {!entity.physicsConfig && (
                  <p className="text-yellow-400">• Add physics in Physics Properties</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Instructions */}
        {!hasModel && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400">
              Load a GLB model file or use the Files tab to drag and drop models into the scene.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 