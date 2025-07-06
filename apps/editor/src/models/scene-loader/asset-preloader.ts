import * as THREE from "three/webgpu";
import { SceneData } from "./types";
import { AssetPipeline } from "../asset-pipeline";

export interface AssetReference {
  id: string;
  type: 'texture' | 'model' | 'audio';
  url: string;
  projectPath: string;
  dependencies: string[];
  priority: number;
  estimatedSize: number;
  spatialPosition?: THREE.Vector3;
}

export interface AssetLoadingPlan {
  assets: AssetReference[];
  bundles: AssetBundle[];
  totalSize: number;
  criticalAssets: string[];
}

export interface AssetBundle {
  id: string;
  assets: string[];
  priority: number;
  spatialBounds?: THREE.Box3;
}

export class AssetPreloader {
  private assetPipeline: AssetPipeline;
  private loadingPlans = new Map<string, AssetLoadingPlan>();

  constructor(assetPipeline: AssetPipeline) {
    this.assetPipeline = assetPipeline;
  }

  /**
   * Analyzes scene data to create a comprehensive asset loading plan
   */
  async analyzeScene(sceneData: SceneData, projectPath: string): Promise<AssetLoadingPlan> {
    const planId = `scene_${sceneData.name}_${Date.now()}`;
    
    if (this.loadingPlans.has(planId)) {
      return this.loadingPlans.get(planId)!;
    }

    const assets: AssetReference[] = [];
    const criticalAssets: string[] = [];
    let totalSize = 0;

    // Analyze materials for textures
    const materialAssets = await this.analyzeMaterials(sceneData, projectPath);
    assets.push(...materialAssets);

    // Analyze entities for models and textures
    const entityAssets = await this.analyzeEntities(sceneData, projectPath);
    assets.push(...entityAssets);

    // Analyze audio assets
    const audioAssets = await this.analyzeAudio(sceneData, projectPath);
    assets.push(...audioAssets);

    // Remove duplicates and calculate dependencies
    const uniqueAssets = this.deduplicateAssets(assets);
    const sortedAssets = this.sortAssetsByPriority(uniqueAssets);

    // Create asset bundles for efficient loading
    const bundles = this.createAssetBundles(sortedAssets);

    // Calculate total estimated size
    totalSize = sortedAssets.reduce((sum, asset) => sum + asset.estimatedSize, 0);

    // Identify critical assets that block scene initialization
    criticalAssets.push(...sortedAssets
      .filter(asset => asset.priority > 0.8)
      .map(asset => asset.id));

    const plan: AssetLoadingPlan = {
      assets: sortedAssets,
      bundles,
      totalSize,
      criticalAssets,
    };

    this.loadingPlans.set(planId, plan);
    return plan;
  }

  private async analyzeMaterials(sceneData: SceneData, projectPath: string): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];

    // SceneData doesn't have a materials array - materials are referenced by entities
    // This method will be handled by extracting materials from entities instead
    return assets;
  }

  private async extractMaterialAssets(material: any, projectPath: string): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];
    
    // Common texture properties that might contain asset references
    const textureProperties = [
      'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
      'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap',
      'envMap', 'lightMap', 'clearcoatMap', 'clearcoatRoughnessMap',
      'clearcoatNormalMap', 'sheenColorMap', 'sheenRoughnessMap',
      'specularColorMap', 'specularIntensityMap', 'iridescenceMap',
      'iridescenceThicknessMap', 'transmissionMap', 'thicknessMap'
    ];

    for (const prop of textureProperties) {
      const texturePath = material.properties?.[prop];
      if (texturePath && typeof texturePath === 'string') {
        const textureId = `texture_${material.id}_${prop}`;
        assets.push({
          id: textureId,
          type: 'texture',
          url: texturePath,
          projectPath,
          dependencies: [],
          priority: this.getTexturePriority(prop),
          estimatedSize: this.estimateTextureSize(texturePath),
        });
      }
    }

    return assets;
  }

  private async analyzeEntities(sceneData: SceneData, projectPath: string): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];

    for (const entity of sceneData.entities) {
      const entityAssets = await this.extractEntityAssets(entity, projectPath);
      assets.push(...entityAssets);
    }

    return assets;
  }

  private async extractEntityAssets(entity: any, projectPath: string): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];

    // Extract 3D model assets
    if (entity.type === 'mesh3d' && entity.properties?.modelPath) {
      const modelId = `model_${entity.id}`;
      assets.push({
        id: modelId,
        type: 'model',
        url: entity.properties.modelPath,
        projectPath,
        dependencies: [],
        priority: 0.9, // Models are high priority
        estimatedSize: this.estimateModelSize(entity.properties.modelPath),
        spatialPosition: entity.transform?.position ? 
          new THREE.Vector3(
            entity.transform.position.x,
            entity.transform.position.y,
            entity.transform.position.z
          ) : undefined,
      });
    }

    // Extract texture assets from entity materials
    if (entity.material && entity.material.properties) {
      const materialAssets = await this.extractMaterialAssets(entity.material, projectPath);
      assets.push(...materialAssets);
    }

    return assets;
  }

  private async analyzeAudio(sceneData: SceneData, projectPath: string): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];

    // Extract audio assets from entities that have audio properties
    for (const entity of sceneData.entities) {
      if (entity.properties?.audioPath) {
        const audioId = `audio_${entity.id}`;
        assets.push({
          id: audioId,
          type: 'audio',
          url: entity.properties.audioPath,
          projectPath,
          dependencies: [],
          priority: 0.3, // Audio is lower priority
          estimatedSize: this.estimateAudioSize(entity.properties.audioPath),
          spatialPosition: entity.transform?.position ? 
            new THREE.Vector3(
              entity.transform.position.x,
              entity.transform.position.y,
              entity.transform.position.z
            ) : undefined,
        });
      }
    }

    return assets;
  }

  private deduplicateAssets(assets: AssetReference[]): AssetReference[] {
    const assetMap = new Map<string, AssetReference>();
    
    for (const asset of assets) {
      const key = `${asset.type}_${asset.url}`;
      if (!assetMap.has(key)) {
        assetMap.set(key, asset);
      } else {
        // Merge dependencies and use highest priority
        const existing = assetMap.get(key)!;
        existing.dependencies = [...new Set([...existing.dependencies, ...asset.dependencies])];
        existing.priority = Math.max(existing.priority, asset.priority);
      }
    }

    return Array.from(assetMap.values());
  }

  private sortAssetsByPriority(assets: AssetReference[]): AssetReference[] {
    return assets.sort((a, b) => {
      // Sort by priority (higher first), then by estimated size (smaller first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.estimatedSize - b.estimatedSize;
    });
  }

  private createAssetBundles(assets: AssetReference[]): AssetBundle[] {
    const bundles: AssetBundle[] = [];
    
    // Group assets by type and spatial proximity
    const textureAssets = assets.filter(a => a.type === 'texture');
    const modelAssets = assets.filter(a => a.type === 'model');
    const audioAssets = assets.filter(a => a.type === 'audio');

    // Create texture bundle
    if (textureAssets.length > 0) {
      bundles.push({
        id: 'textures_bundle',
        assets: textureAssets.map(a => a.id),
        priority: Math.max(...textureAssets.map(a => a.priority)),
      });
    }

    // Create model bundles (split by spatial proximity)
    if (modelAssets.length > 0) {
      const spatialBundles = this.groupAssetsBySpatialProximity(modelAssets);
      bundles.push(...spatialBundles);
    }

    // Create audio bundle
    if (audioAssets.length > 0) {
      bundles.push({
        id: 'audio_bundle',
        assets: audioAssets.map(a => a.id),
        priority: Math.max(...audioAssets.map(a => a.priority)),
      });
    }

    return bundles;
  }

  private groupAssetsBySpatialProximity(assets: AssetReference[]): AssetBundle[] {
    const bundles: AssetBundle[] = [];
    const processed = new Set<string>();
    const proximityThreshold = 50; // Units in 3D space

    for (const asset of assets) {
      if (processed.has(asset.id) || !asset.spatialPosition) {
        continue;
      }

      const bundleAssets = [asset.id];
      processed.add(asset.id);

      // Find nearby assets
      for (const other of assets) {
        if (processed.has(other.id) || !other.spatialPosition) {
          continue;
        }

        const distance = asset.spatialPosition.distanceTo(other.spatialPosition);
        if (distance <= proximityThreshold) {
          bundleAssets.push(other.id);
          processed.add(other.id);
        }
      }

      bundles.push({
        id: `spatial_bundle_${bundles.length}`,
        assets: bundleAssets,
        priority: Math.max(...bundleAssets.map(id => 
          assets.find(a => a.id === id)?.priority || 0
        )),
      });
    }

    return bundles;
  }

  private getTexturePriority(textureType: string): number {
    const priorities: Record<string, number> = {
      'map': 0.9,              // Base color - most important
      'normalMap': 0.8,        // Normal maps are very important
      'roughnessMap': 0.7,     // PBR textures
      'metalnessMap': 0.7,
      'aoMap': 0.6,            // Ambient occlusion
      'emissiveMap': 0.5,      // Emissive
      'bumpMap': 0.4,          // Bump maps
      'displacementMap': 0.3,  // Displacement
      'alphaMap': 0.6,         // Alpha - important for transparency
      'envMap': 0.5,           // Environment maps
      'lightMap': 0.4,         // Light maps
      'clearcoatMap': 0.3,     // Clearcoat effects
      'clearcoatRoughnessMap': 0.3,
      'clearcoatNormalMap': 0.3,
      'sheenColorMap': 0.2,    // Sheen effects
      'sheenRoughnessMap': 0.2,
      'specularColorMap': 0.3,
      'specularIntensityMap': 0.3,
      'iridescenceMap': 0.2,   // Iridescence effects
      'iridescenceThicknessMap': 0.2,
      'transmissionMap': 0.4,  // Transmission
      'thicknessMap': 0.3,
    };

    return priorities[textureType] || 0.5;
  }

  private estimateTextureSize(texturePath: string): number {
    // Rough estimation based on file extension and common resolutions
    const ext = texturePath.split('.').pop()?.toLowerCase();
    const sizeMultipliers: Record<string, number> = {
      'jpg': 1.0,
      'jpeg': 1.0,
      'png': 2.0,
      'webp': 0.8,
      'avif': 0.6,
      'ktx2': 0.5,
      'basis': 0.4,
    };

    const baseSizeKB = 1024; // Assume 1MB average texture
    const multiplier = sizeMultipliers[ext || 'jpg'] || 1.0;
    
    return baseSizeKB * 1024 * multiplier; // Convert to bytes
  }

  private estimateModelSize(modelPath: string): number {
    // Rough estimation based on file extension
    const ext = modelPath.split('.').pop()?.toLowerCase();
    const sizeMultipliers: Record<string, number> = {
      'glb': 1.0,
      'gltf': 1.2, // Usually larger due to separate files
      'fbx': 1.5,
      'obj': 2.0,
      'dae': 1.8,
    };

    const baseSizeMB = 5; // Assume 5MB average model
    const multiplier = sizeMultipliers[ext || 'glb'] || 1.0;
    
    return baseSizeMB * 1024 * 1024 * multiplier; // Convert to bytes
  }

  private estimateAudioSize(audioPath: string): number {
    // Rough estimation based on file extension
    const ext = audioPath.split('.').pop()?.toLowerCase();
    const sizeMultipliers: Record<string, number> = {
      'mp3': 1.0,
      'wav': 10.0,
      'ogg': 0.8,
      'webm': 0.7,
      'opus': 0.6,
      'aac': 0.9,
    };

    const baseSizeMB = 3; // Assume 3MB average audio file
    const multiplier = sizeMultipliers[ext || 'mp3'] || 1.0;
    
    return baseSizeMB * 1024 * 1024 * multiplier; // Convert to bytes
  }

  /**
   * Registers assets with the asset pipeline for streaming
   */
  async registerAssetsForStreaming(plan: AssetLoadingPlan): Promise<void> {
    for (const asset of plan.assets) {
      this.assetPipeline.registerStreamingAsset(asset.id, {
        url: asset.url,
        type: asset.type,
        priority: asset.priority,
        spatialPosition: asset.spatialPosition,
        dependencies: asset.dependencies,
        estimatedSize: asset.estimatedSize,
      });
    }

    // Register bundles
    for (const bundle of plan.bundles) {
      this.assetPipeline.createBundle(bundle.id, bundle.assets, {
        priority: bundle.priority,
        spatialBounds: bundle.spatialBounds,
      });
    }
  }

  /**
   * Clears loading plans to free memory
   */
  clearLoadingPlans(): void {
    this.loadingPlans.clear();
  }

  /**
   * Gets the loading plan for a specific scene
   */
  getLoadingPlan(sceneId: string): AssetLoadingPlan | undefined {
    return Array.from(this.loadingPlans.values()).find(plan => 
      plan.assets.some(asset => asset.url.includes(sceneId))
    );
  }
} 