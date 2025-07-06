import * as THREE from "three/webgpu";
import { GameWorld } from "../game-world";
import { EntityLoader } from "./entity-loader";
import { PhysicsLoader } from "./physics-loader";
import { SceneData, LoaderContext } from "./types";
import { AssetManager } from "../asset-manager";
import { AssetPipeline, DEFAULT_PIPELINE_CONFIG, DEFAULT_STREAMING_CONFIG } from "../asset-pipeline";
import { ParallelAssetLoader, LoadingProgress, LoadingOptions } from "./parallel-asset-loader";
import { materialSystem } from "../../services/material-system";
import { MaterialApplicationService } from "../../pages/game-studio-page/components/material-editor/material-application-service";
import useGameStudioStore from "../../stores/game-studio-store";

export interface EnhancedSceneLoaderOptions extends LoadingOptions {
  enableAssetPipeline?: boolean;
  enableBackgroundLoading?: boolean;
  showLoadingProgress?: boolean;
  retryFailedAssets?: boolean;
  retryAttempts?: number;
}

export class EnhancedSceneLoader {
  private entityLoader: EntityLoader;
  private physicsLoader: PhysicsLoader;
  private assetManager: AssetManager;
  private assetPipeline: AssetPipeline;
  private parallelAssetLoader: ParallelAssetLoader;
  
  // Loading state
  private currentLoadingSession?: {
    sceneData: SceneData;
    projectPath: string;
    loadedAssets: Map<string, any>;
    gameWorld: GameWorld;
    startTime: number;
  };
  
  // Progress callbacks
  private onProgressCallback?: (progress: LoadingProgress) => void;
  private onCompleteCallback?: (success: boolean, error?: Error) => void;

  constructor(assetManager?: AssetManager, options: EnhancedSceneLoaderOptions = {}) {
    this.entityLoader = new EntityLoader();
    this.physicsLoader = new PhysicsLoader();
    this.assetManager = assetManager || new AssetManager();
    
    // Initialize asset pipeline with optimized settings
    this.assetPipeline = new AssetPipeline(
      this.assetManager,
      {
        ...DEFAULT_PIPELINE_CONFIG,
        textures: {
          ...DEFAULT_PIPELINE_CONFIG.textures,
          compression: 'none',
          mipmapGeneration: true,
          resizeTargets: [512, 1024, 2048],
          formats: ['webp', 'avif', 'jpg'],
        },
        models: {
          ...DEFAULT_PIPELINE_CONFIG.models,
          compression: 'draco',
          optimization: {
            mergeGeometries: true,
            deduplicateVertices: true,
            quantization: true,
          },
        },
      },
      {
        ...DEFAULT_STREAMING_CONFIG,
        spatialLoading: {
          enabled: true,
          loadDistance: 100,
          unloadDistance: 150,
          priorityZones: [],
        },
        memory: {
          maxCacheSize: 512 * 1024 * 1024, // 512MB
          priorityEviction: true,
          backgroundUnloading: true,
        },
      }
    );
    
    this.parallelAssetLoader = new ParallelAssetLoader(this.assetManager, this.assetPipeline);
    this.setupLoadingCallbacks();
  }

  private setupLoadingCallbacks(): void {
    this.parallelAssetLoader.onProgress((progress) => {
      this.onProgressCallback?.(progress);
    });

    this.parallelAssetLoader.onError((error, assetId) => {
      console.error(`Asset loading error for ${assetId}:`, error);
      // Continue loading other assets even if one fails
    });

    this.parallelAssetLoader.onAssetLoaded((assetId, asset) => {
      // Asset loaded successfully - can be used for progressive loading
      if (this.currentLoadingSession) {
        this.currentLoadingSession.loadedAssets.set(assetId, asset);
        this.tryApplyLoadedAsset(assetId, asset);
      }
    });
  }

  private tryApplyLoadedAsset(assetId: string, asset: any): void {
    if (!this.currentLoadingSession) return;

    // Apply asset to scene as soon as it's loaded (progressive loading)
    try {
      const { sceneData, gameWorld } = this.currentLoadingSession;
      
      // Find and update entities that use this asset
      for (const entity of sceneData.entities) {
        if (this.entityUsesAsset(entity, assetId)) {
          this.applyAssetToEntity(entity, assetId, asset, gameWorld);
        }
      }
    } catch (error) {
      console.error(`Failed to apply asset ${assetId}:`, error);
    }
  }

  private entityUsesAsset(entity: any, assetId: string): boolean {
    // Check if entity uses this asset
    if (entity.type === 'mesh3d' && assetId.includes(`model_${entity.id}`)) {
      return true;
    }
    
    // Check if entity material uses this texture
    if (entity.material && assetId.includes(`texture_${entity.material.id}`)) {
      return true;
    }
    
    return false;
  }

  private applyAssetToEntity(entity: any, assetId: string, asset: any, gameWorld: GameWorld): void {
    try {
      // Skip progressive loading for now - this will be handled by the regular entity loading
      // const sceneEntity = gameWorld.scene.getEntity(entity.id);
      // if (!sceneEntity) return;

      // if (assetId.includes('model_') && entity.type === 'mesh3d') {
      //   // Apply loaded model
      //   if (sceneEntity.loadFromGLTF && asset.scene) {
      //     sceneEntity.loadFromGLTF(asset);
      //   }
      // } else if (assetId.includes('texture_') && entity.material) {
      //   // Apply loaded texture to material
      //   this.applyTextureToEntity(sceneEntity, assetId, asset);
      // }
    } catch (error) {
      console.error(`Failed to apply asset ${assetId} to entity ${entity.id}:`, error);
    }
  }

  private applyTextureToEntity(entity: any, assetId: string, texture: THREE.Texture): void {
    if (!entity.material) return;

    // Extract texture type from asset ID
    const textureType = assetId.split('_').pop();
    if (!textureType) return;

    // Apply texture to material
    if (textureType in entity.material) {
      (entity.material as any)[textureType] = texture;
      entity.material.needsUpdate = true;
    }
  }

  /**
   * Enhanced scene loading with parallel asset loading
   */
  async loadScene(
    gameWorld: GameWorld,
    sceneData: SceneData,
    options: EnhancedSceneLoaderOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    const currentProject = useGameStudioStore.getState().currentProject;
    
    if (!currentProject) {
      throw new Error("No project loaded");
    }

    // Initialize loading session
    this.currentLoadingSession = {
      sceneData,
      projectPath: currentProject.path,
      loadedAssets: new Map(),
      gameWorld,
      startTime,
    };

    try {
      // Clear existing scene
      gameWorld.scene.clear();

      // Phase 1: Load assets in parallel
      const loadedAssets = await this.parallelAssetLoader.loadSceneAssets(
        sceneData,
        currentProject.path,
        {
          maxConcurrentLoads: options.maxConcurrentLoads || 8,
          enableProgressiveLoading: options.enableProgressiveLoading ?? true,
          enablePlaceholders: options.enablePlaceholders ?? true,
          prioritizeVisibleAssets: options.prioritizeVisibleAssets ?? true,
          timeoutMs: options.timeoutMs || 30000,
        }
      );

      // Phase 2: Apply loaded assets to scene
      await this.applyAssetsToScene(gameWorld, sceneData, loadedAssets, currentProject.path);

      // Phase 3: Load rendering settings
      await this.loadRenderingSettings(gameWorld, sceneData);

      // Phase 4: Load physics
      await this.loadPhysics(gameWorld, sceneData);

      // Phase 5: Load entities (now with assets available)
      await this.loadEntities(gameWorld, sceneData, loadedAssets);

      // Phase 6: Load editor settings
      await this.loadEditorSettings(gameWorld, sceneData);

      // Setup shadow mapping
      gameWorld.getRenderer().shadowMap.enabled = true;
      gameWorld.getRenderer().shadowMap.type = THREE.PCFShadowMap;

      // Final progress update
      this.onProgressCallback?.({
        phase: 'complete',
        overallProgress: 100,
        assetsLoaded: loadedAssets.size,
        totalAssets: loadedAssets.size,
        loadingTimeMs: Date.now() - startTime,
        estimatedTimeRemainingMs: 0,
      });

      this.onCompleteCallback?.(true);

    } catch (error) {
      console.error(`Failed to load scene "${sceneData.name}":`, error);
      this.onCompleteCallback?.(false, error as Error);
      throw error;
    } finally {
      // Clean up loading session
      this.currentLoadingSession = undefined;
    }
  }

  private async applyAssetsToScene(
    gameWorld: GameWorld,
    sceneData: SceneData,
    loadedAssets: Map<string, any>,
    projectPath: string
  ): Promise<void> {
    // Create enhanced loader context with preloaded assets
    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
      assetManager: this.assetManager,
    };

    // Extract textures from loaded assets and add to context
    for (const [assetId, asset] of loadedAssets) {
      if (assetId.includes('texture_') && asset instanceof THREE.Texture) {
        context.textures.set(assetId, asset);
      }
    }

    // Skip materials loading for now - materials are handled by the material system
    // await this.loadMaterials(context, sceneData, loadedAssets);
  }

  private async loadMaterials(
    context: LoaderContext,
    sceneData: SceneData,
    loadedAssets: Map<string, any>
  ): Promise<void> {
    // Skip materials loading - materials are handled by the material system
    // Materials are referenced by materialId in entities and loaded separately
    return;
  }

  private async createMaterialWithPreloadedTextures(
    materialData: any,
    loadedAssets: Map<string, any>,
    context: LoaderContext
  ): Promise<THREE.Material> {
    // Create base material
    let material: THREE.Material;
    
    switch (materialData.type) {
      case 'MeshStandardMaterial':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'MeshPhysicalMaterial':
        material = new THREE.MeshPhysicalMaterial();
        break;
      case 'MeshBasicMaterial':
        material = new THREE.MeshBasicMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // Apply basic properties
    if (materialData.properties) {
      Object.assign(material, materialData.properties);
    }

    // Apply preloaded textures
    await this.applyPreloadedTextures(material, materialData, loadedAssets);

    return material;
  }

  private async applyPreloadedTextures(
    material: THREE.Material,
    materialData: any,
    loadedAssets: Map<string, any>
  ): Promise<void> {
    if (!materialData.properties) return;

    const textureProperties = [
      'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
      'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap',
      'envMap', 'lightMap', 'clearcoatMap', 'clearcoatRoughnessMap',
      'clearcoatNormalMap'
    ];

    for (const prop of textureProperties) {
      if (materialData.properties[prop]) {
        const textureId = `texture_${materialData.id}_${prop}`;
        const texture = loadedAssets.get(textureId);
        
        if (texture && texture instanceof THREE.Texture) {
          (material as any)[prop] = texture;
        }
      }
    }

    material.needsUpdate = true;
  }

  private async loadRenderingSettings(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    const renderer = gameWorld.getRenderer();
    
    if (sceneData.rendering) {
      // Apply rendering settings
      if (sceneData.rendering.shadows !== undefined) {
        renderer.shadowMap.enabled = sceneData.rendering.shadows;
      }
      if (sceneData.rendering.shadowType) {
        switch (sceneData.rendering.shadowType) {
          case 'PCF':
            renderer.shadowMap.type = THREE.PCFShadowMap;
            break;
          case 'PCFSoft':
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            break;
          case 'VSM':
            renderer.shadowMap.type = THREE.VSMShadowMap;
            break;
        }
      }
      if (sceneData.rendering.toneMapping !== undefined) {
        renderer.toneMapping = sceneData.rendering.toneMapping;
      }
      if (sceneData.rendering.toneMappingExposure !== undefined) {
        renderer.toneMappingExposure = sceneData.rendering.toneMappingExposure;
      }
    }

    // Set background
    if (sceneData.world?.background) {
      const bg = sceneData.world.background;
      if (bg.type === 'color') {
        gameWorld.scene.background = new THREE.Color(bg.color);
      } else if (bg.type === 'gradient') {
        // Create gradient background
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, bg.colorTop);
        gradient.addColorStop(1, bg.colorBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        gameWorld.scene.background = new THREE.CanvasTexture(canvas);
      }
    }
  }

  private async loadPhysics(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
      assetManager: this.assetManager,
    };

    const physicsData = {
      enabled: sceneData.world.physics.enabled,
      gravity: [sceneData.world.gravity.x, sceneData.world.gravity.y, sceneData.world.gravity.z] as [number, number, number],
      debugRender: sceneData.editor?.debugPhysics || false,
      solver: {
        iterations: 10,
        timestep: sceneData.world.physics.timeStep
      }
    };

    await this.physicsLoader.load(context, physicsData);
  }

  private async loadEntities(
    gameWorld: GameWorld,
    sceneData: SceneData,
    loadedAssets: Map<string, any>
  ): Promise<void> {
    const context: LoaderContext = {
      gameWorld,
      materials: new Map(),
      geometries: new Map(),
      textures: new Map(),
      assetManager: this.assetManager,
    };

    // Convert SceneEntity to EntityData format
    const entityData = sceneData.entities as any[];
    
    // Pre-populate context with loaded assets
    for (const [assetId, asset] of loadedAssets) {
      if (assetId.includes('texture_') && asset instanceof THREE.Texture) {
        context.textures.set(assetId, asset);
      }
    }

    await this.entityLoader.load(context, entityData);
  }

  private async loadEditorSettings(gameWorld: GameWorld, sceneData: SceneData): Promise<void> {
    if (!sceneData.editor) return;

    // Apply editor settings like grid, gizmos, etc.
    const editorSettings = sceneData.editor;
    
    // Grid settings
    if (editorSettings.grid !== undefined) {
      gameWorld.registry.setConfig('editor.grid.enabled', editorSettings.grid);
    }
    
    // Camera settings
    if (editorSettings.camera) {
      const camera = gameWorld.scene.getActiveCamera();
      if (camera && editorSettings.camera.position) {
        camera.position.set(
          editorSettings.camera.position.x,
          editorSettings.camera.position.y,
          editorSettings.camera.position.z
        );
      }
    }
  }

  // Public API methods
  public onProgress(callback: (progress: LoadingProgress) => void): void {
    this.onProgressCallback = callback;
  }

  public onComplete(callback: (success: boolean, error?: Error) => void): void {
    this.onCompleteCallback = callback;
  }

  public cancelLoading(): void {
    this.parallelAssetLoader.cancelLoading();
    this.currentLoadingSession = undefined;
  }

  public getLoadingProgress(): LoadingProgress {
    return this.parallelAssetLoader.getLoadingProgress();
  }

  public getLoadedAssets(): Map<string, any> {
    return this.parallelAssetLoader.getLoadedAssets();
  }

  public getFailedAssets(): Map<string, Error> {
    return this.parallelAssetLoader.getFailedAssets();
  }

  public dispose(): void {
    this.parallelAssetLoader.dispose();
    this.assetPipeline.dispose();
    this.currentLoadingSession = undefined;
  }
} 