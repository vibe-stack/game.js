// Asset Pipeline Usage Example
// Shows how to set up streaming for an open world game

import * as THREE from "three/webgpu";
import { 
  AssetManager, 
  AssetPipeline, 
  AssetPipelineConfig, 
  StreamingConfig,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_STREAMING_CONFIG
} from "./index";

/**
 * Example: Setting up asset pipeline for an open world game
 * This demonstrates:
 * - Spatial streaming based on player position
 * - Level-of-detail (LOD) streaming
 * - Adaptive quality based on network conditions
 * - Asset bundling for efficient loading
 * - Preprocessing for optimal runtime performance
 */

export class OpenWorldAssetSystem {
  private assetManager: AssetManager;
  private assetPipeline: AssetPipeline;
  private playerPosition = new THREE.Vector3();

  constructor() {
    // Initialize the base asset manager
    this.assetManager = new AssetManager();
    
    // Configure the asset pipeline for open world scenarios
    const pipelineConfig: AssetPipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      // Enhanced texture settings for large worlds
      textures: {
        compression: 'basis', // Universal texture compression
        mipmapGeneration: true,
        resizeTargets: [256, 512, 1024, 2048, 4096], // Multiple quality levels
        formats: ['webp', 'jpg'], // Fallback support
      },
      // Aggressive model optimization for performance
      models: {
        compression: 'draco',
        optimization: {
          mergeGeometries: true,
          deduplicateVertices: true,
          quantization: true,
        },
        lodGeneration: {
          enabled: true,
          levels: [0.8, 0.6, 0.4, 0.2, 0.1], // More LOD levels for open world
        },
      },
      // High-quality audio with compression
      audio: {
        compression: 'opus',
        bitrates: [96, 128, 256], // Different quality levels
        spatialAudio: true,
      },
      buildTime: {
        atlasGeneration: true, // Reduce draw calls
        shaderPrecompilation: true, // Eliminate shader compilation hitches
        assetBundling: true, // Efficient loading
      },
    };

    // Configure streaming for large open worlds
    const streamingConfig: StreamingConfig = {
      ...DEFAULT_STREAMING_CONFIG,
      spatialLoading: {
        enabled: true,
        loadDistance: 200, // Load assets within 200 units
        unloadDistance: 400, // Unload assets beyond 400 units
        priorityZones: [
          // High priority around spawn points
          {
            center: new THREE.Vector3(0, 0, 0),
            radius: 50,
            priority: 2.0,
          },
          // Medium priority around major landmarks
          {
            center: new THREE.Vector3(500, 0, 500),
            radius: 100,
            priority: 1.5,
          },
        ],
      },
      lodStreaming: {
        enabled: true,
        distanceThresholds: [50, 100, 200, 400, 800], // Distance-based LOD
        qualityLevels: ['ultra', 'high', 'medium', 'low', 'ultra-low'],
      },
      predictive: {
        enabled: true,
        cameraVelocityWeight: 3.0, // Strong predictive loading
        userBehaviorWeight: 2.0,
        preloadRadius: 100, // Preload 100 units ahead
      },
      adaptive: {
        enabled: true,
        bandwidthThresholds: {
          slow: 2,   // 2 Mbps
          medium: 20, // 20 Mbps
          fast: 100,  // 100 Mbps
        },
        qualityAdjustment: true,
      },
      memory: {
        maxCacheSize: 2 * 1024 * 1024 * 1024, // 2GB cache for open world
        priorityEviction: true,
        backgroundUnloading: true,
      },
    };

    // Initialize the asset pipeline
    this.assetPipeline = new AssetPipeline(
      this.assetManager,
      pipelineConfig,
      streamingConfig
    );

    this.setupWorldAssets();
  }

  private setupWorldAssets(): void {
    // Register terrain chunks (example: 64x64 world divided into chunks)
    this.registerTerrainChunks();
    
    // Register vegetation (trees, grass, rocks)
    this.registerVegetation();
    
    // Register buildings and structures
    this.registerStructures();
    
    // Register ambient audio zones
    this.registerAmbientAudio();
    
    // Create asset bundles for efficient loading
    this.createAssetBundles();
  }

  private registerTerrainChunks(): void {
    const chunkSize = 100;
    const worldSize = 6400; // 64x64 chunks
    const chunksPerSide = worldSize / chunkSize;

    for (let x = 0; x < chunksPerSide; x++) {
      for (let z = 0; z < chunksPerSide; z++) {
        const chunkId = `terrain_${x}_${z}`;
        const worldX = (x - chunksPerSide / 2) * chunkSize;
        const worldZ = (z - chunksPerSide / 2) * chunkSize;

        this.assetPipeline.registerStreamingAsset(chunkId, {
          url: `/assets/terrain/chunk_${x}_${z}.glb`,
          type: 'model',
          priority: 1.0,
          spatialPosition: new THREE.Vector3(worldX, 0, worldZ),
          estimatedSize: 5 * 1024 * 1024, // 5MB per chunk
        });

        // Register terrain textures
        this.assetPipeline.registerStreamingAsset(`${chunkId}_diffuse`, {
          url: `/assets/terrain/textures/chunk_${x}_${z}_diffuse.webp`,
          type: 'texture',
          priority: 1.0,
          spatialPosition: new THREE.Vector3(worldX, 0, worldZ),
          estimatedSize: 2 * 1024 * 1024, // 2MB texture
        });

        this.assetPipeline.registerStreamingAsset(`${chunkId}_normal`, {
          url: `/assets/terrain/textures/chunk_${x}_${z}_normal.webp`,
          type: 'texture',
          priority: 0.8,
          spatialPosition: new THREE.Vector3(worldX, 0, worldZ),
          dependencies: [`${chunkId}_diffuse`], // Load diffuse first
          estimatedSize: 2 * 1024 * 1024,
        });
      }
    }
  }

  private registerVegetation(): void {
    // Register tree assets with LOD variants
    const treeTypes = ['oak', 'pine', 'birch', 'willow'];
    
    for (const treeType of treeTypes) {
      // High-quality version (close distance)
      this.assetPipeline.registerStreamingAsset(`tree_${treeType}_high`, {
        url: `/assets/vegetation/trees/${treeType}_high.glb`,
        type: 'model',
        priority: 0.8,
        estimatedSize: 1024 * 1024, // 1MB
      });

      // Medium-quality version
      this.assetPipeline.registerStreamingAsset(`tree_${treeType}_medium`, {
        url: `/assets/vegetation/trees/${treeType}_medium.glb`,
        type: 'model',
        priority: 0.6,
        estimatedSize: 512 * 1024, // 512KB
      });

      // Low-quality version (far distance)
      this.assetPipeline.registerStreamingAsset(`tree_${treeType}_low`, {
        url: `/assets/vegetation/trees/${treeType}_low.glb`,
        type: 'model',
        priority: 0.4,
        estimatedSize: 256 * 1024, // 256KB
      });
    }

    // Register grass and foliage textures
    this.assetPipeline.registerStreamingAsset('grass_atlas', {
      url: '/assets/vegetation/grass_atlas.webp',
      type: 'texture',
      priority: 0.7,
      estimatedSize: 4 * 1024 * 1024, // 4MB atlas
    });
  }

  private registerStructures(): void {
    // Register building assets with interior/exterior separation
    const buildingTypes = ['house', 'shop', 'tower', 'barn'];

    for (const buildingType of buildingTypes) {
      // Exterior (always loaded when nearby)
      this.assetPipeline.registerStreamingAsset(`building_${buildingType}_exterior`, {
        url: `/assets/buildings/${buildingType}/${buildingType}_exterior.glb`,
        type: 'model',
        priority: 1.2,
        estimatedSize: 2 * 1024 * 1024,
      });

      // Interior (only loaded when player is very close or inside)
      this.assetPipeline.registerStreamingAsset(`building_${buildingType}_interior`, {
        url: `/assets/buildings/${buildingType}/${buildingType}_interior.glb`,
        type: 'model',
        priority: 1.5,
        dependencies: [`building_${buildingType}_exterior`],
        estimatedSize: 3 * 1024 * 1024,
      });
    }
  }

  private registerAmbientAudio(): void {
    // Register ambient audio zones
    const ambientZones = [
      { id: 'forest', position: new THREE.Vector3(-1000, 0, -1000), radius: 500 },
      { id: 'village', position: new THREE.Vector3(0, 0, 0), radius: 300 },
      { id: 'river', position: new THREE.Vector3(500, 0, -500), radius: 200 },
      { id: 'mountains', position: new THREE.Vector3(1000, 0, 1000), radius: 800 },
    ];

    for (const zone of ambientZones) {
      this.assetPipeline.registerStreamingAsset(`ambient_${zone.id}`, {
        url: `/assets/audio/ambient/${zone.id}.opus`,
        type: 'audio',
        priority: 0.6,
        spatialPosition: zone.position,
        estimatedSize: 500 * 1024, // 500KB compressed audio
      });
    }
  }

  private createAssetBundles(): void {
    // Create bundles for related assets that should load together
    
    // Starter area bundle (always loaded)
    this.assetPipeline.createBundle('starter_area', [
      'terrain_32_32', 'terrain_32_32_diffuse', 'terrain_32_32_normal',
      'building_house_exterior', 'building_shop_exterior',
      'tree_oak_high', 'tree_pine_high',
      'ambient_village',
    ], {
      priority: 3.0, // Highest priority
      spatialBounds: new THREE.Box3(
        new THREE.Vector3(-100, -10, -100),
        new THREE.Vector3(100, 50, 100)
      ),
    });

    // Forest bundles (load when entering forest areas)
    this.assetPipeline.createBundle('forest_area', [
      'tree_oak_high', 'tree_oak_medium', 'tree_oak_low',
      'tree_pine_high', 'tree_pine_medium', 'tree_pine_low',
      'tree_birch_high', 'tree_birch_medium', 'tree_birch_low',
      'grass_atlas',
      'ambient_forest',
    ], {
      priority: 2.0,
      spatialBounds: new THREE.Box3(
        new THREE.Vector3(-1500, 0, -1500),
        new THREE.Vector3(-500, 100, -500)
      ),
    });
  }

  // Public API for game integration
  public updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
    this.assetPipeline.updateSpatialPosition(position);
  }

  public async preloadStarterArea(): Promise<void> {
    // Preload essential assets for game start
    await this.assetPipeline.loadBundle('starter_area');
  }

  public getStreamingStatus() {
    return this.assetPipeline.getStreamingStatus();
  }

  public getPerformanceMetrics() {
    return this.assetPipeline.getMetrics();
  }

  // Asset quality management
  public setQualityLevel(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    // Adjust streaming distances based on quality level
    const config = this.assetPipeline['streamingConfig']; // Access private property for example
    
    switch (level) {
      case 'low':
        config.spatialLoading.loadDistance = 100;
        config.spatialLoading.unloadDistance = 150;
        break;
      case 'medium':
        config.spatialLoading.loadDistance = 150;
        config.spatialLoading.unloadDistance = 250;
        break;
      case 'high':
        config.spatialLoading.loadDistance = 200;
        config.spatialLoading.unloadDistance = 400;
        break;
      case 'ultra':
        config.spatialLoading.loadDistance = 300;
        config.spatialLoading.unloadDistance = 600;
        break;
    }
  }

  // Memory management
  public forceCacheCleanup(): void {
    // Force cleanup of distant assets
    const position = this.playerPosition;
    // Implementation would force unload assets beyond a certain distance
  }

  public dispose(): void {
    this.assetPipeline.dispose();
  }
}

// Usage example in a game loop
export function gameLoopExample() {
  const assetSystem = new OpenWorldAssetSystem();
  
  // Initialize
  assetSystem.preloadStarterArea().then(() => { 
    
    // Game loop
    function update(deltaTime: number) {
      // Update player position (from your character controller)
      const playerPosition = new THREE.Vector3(/* get from game state */);
      assetSystem.updatePlayerPosition(playerPosition);
      
      // Monitor streaming performance
      const status = assetSystem.getStreamingStatus();
      
      // Monitor performance metrics
      const metrics = assetSystem.getPerformanceMetrics();
      if (metrics.performance.loadingHitches > 5) {
        console.warn('Performance issue detected, consider reducing quality');
        assetSystem.setQualityLevel('medium');
      }
      
      // Memory management
      if (metrics.streaming.memoryUtilization > 90) {
        assetSystem.forceCacheCleanup();
      }
    }
    
    // Set up game loop
    setInterval(() => update(16.67), 16.67); // 60 FPS
  });
}

// Build-time asset preprocessing example
export async function preprocessAssets() {
  const assetManager = new AssetManager();
  const pipeline = new AssetPipeline(
    assetManager,
    DEFAULT_PIPELINE_CONFIG,
    DEFAULT_STREAMING_CONFIG
  );

  // Example: Preprocess a high-resolution texture
  const textureData = await fetch('/raw-assets/tree-bark-4k.png')
    .then(r => r.arrayBuffer());

  // Generate multiple quality variants
  const highQuality = await pipeline.preprocessTexture(textureData, {
    targetSize: 2048,
    format: 'webp',
    generateMipmaps: true,
  });

  const mediumQuality = await pipeline.preprocessTexture(textureData, {
    targetSize: 1024,
    format: 'webp',
    generateMipmaps: true,
  });

  const lowQuality = await pipeline.preprocessTexture(textureData, {
    targetSize: 512,
    format: 'jpg', // Better for low-end devices
    generateMipmaps: false,
  });

  // Save processed variants
  // In a real build system, you'd save these to your asset directory


  pipeline.dispose();
}