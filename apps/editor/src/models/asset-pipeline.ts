import * as THREE from "three/webgpu";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetManager, AssetData, LoadingProgress } from "./asset-manager";

// Asset pipeline configuration
export interface AssetPipelineConfig {
  // Preprocessing settings
  textures: {
    compression: 'none' | 'ktx2' | 'basis' | 'astc';
    mipmapGeneration: boolean;
    resizeTargets: number[]; // [512, 1024, 2048] for different quality levels
    formats: ('webp' | 'avif' | 'jpg' | 'png')[];
  };
  models: {
    compression: 'none' | 'draco' | 'meshopt';
    optimization: {
      mergeGeometries: boolean;
      deduplicateVertices: boolean;
      quantization: boolean;
    };
    lodGeneration: {
      enabled: boolean;
      levels: number[];  // [0.8, 0.6, 0.4, 0.2] reduction ratios
    };
  };
  audio: {
    compression: 'none' | 'opus' | 'aac' | 'ogg';
    bitrates: number[]; // [128, 256, 320] kbps
    spatialAudio: boolean;
  };
  // Build-time processing
  buildTime: {
    atlasGeneration: boolean;
    shaderPrecompilation: boolean;
    assetBundling: boolean;
  };
}

// Streaming configuration
export interface StreamingConfig {
  // Distance-based loading
  spatialLoading: {
    enabled: boolean;
    loadDistance: number;
    unloadDistance: number;
    priorityZones: Array<{
      center: THREE.Vector3;
      radius: number;
      priority: number;
    }>;
  };
  // Level-of-detail streaming
  lodStreaming: {
    enabled: boolean;
    distanceThresholds: number[];
    qualityLevels: ('ultra-low' | 'low' | 'medium' | 'high' | 'ultra')[];
  };
  // Predictive loading
  predictive: {
    enabled: boolean;
    cameraVelocityWeight: number;
    userBehaviorWeight: number;
    preloadRadius: number;
  };
  // Network-aware streaming
  adaptive: {
    enabled: boolean;
    bandwidthThresholds: {
      slow: number;    // < 1 Mbps
      medium: number;  // 1-10 Mbps
      fast: number;    // > 10 Mbps
    };
    qualityAdjustment: boolean;
  };
  // Memory management
  memory: {
    maxCacheSize: number;
    priorityEviction: boolean;
    backgroundUnloading: boolean;
  };
}

// Asset streaming states
export type AssetStreamingState = 
  | 'unloaded' 
  | 'queued' 
  | 'loading' 
  | 'loaded' 
  | 'cached' 
  | 'evicted';

export interface StreamingAsset extends AssetData {
  state: AssetStreamingState;
  priority: number;
  lodLevel: number;
  spatialPosition?: THREE.Vector3;
  dependencies: string[];
  estimatedSize: number;
  actualSize?: number;
  loadPromise?: Promise<any>;
}

// Asset bundling for efficient loading
export interface AssetBundle {
  id: string;
  assets: string[];
  size: number;
  priority: number;
  spatialBounds?: THREE.Box3;
}

// Performance metrics
export interface PipelineMetrics {
  preprocessing: {
    texturesProcessed: number;
    modelsOptimized: number;
    totalSizeReduction: number;
    processingTime: number;
  };
  streaming: {
    assetsStreamed: number;
    averageLoadTime: number;
    cacheHitRatio: number;
    bandwidthUsage: number;
    memoryUtilization: number;
  };
  performance: {
    frameTime: number;
    loadingHitches: number;
    backgroundThreadUsage: number;
  };
}

export class AssetPipeline {
  private config: AssetPipelineConfig;
  private streamingConfig: StreamingConfig;
  private assetManager: AssetManager;
  
  // Streaming state
  private streamingAssets = new Map<string, StreamingAsset>();
  private loadingQueue: StreamingAsset[] = [];
  private bundles = new Map<string, AssetBundle>();
  
  // Performance tracking
  private metrics: PipelineMetrics;
  private loadingWorker?: Worker;
  private preprocessingWorker?: Worker;
  
  // Spatial tracking
  private currentPosition = new THREE.Vector3();
  private cameraVelocity = new THREE.Vector3();
  private lastCameraPosition = new THREE.Vector3();
  
  // Network monitoring
  private networkSpeed = 0;
  private adaptiveQuality: 'low' | 'medium' | 'high' | 'ultra' = 'medium';

  constructor(
    assetManager: AssetManager,
    config: AssetPipelineConfig,
    streamingConfig: StreamingConfig
  ) {
    this.assetManager = assetManager;
    this.config = config;
    this.streamingConfig = streamingConfig;
    
    this.metrics = this.initializeMetrics();
    this.initializeWorkers();
    this.startNetworkMonitoring();
    this.startStreamingLoop();
  }

  private initializeMetrics(): PipelineMetrics {
    return {
      preprocessing: {
        texturesProcessed: 0,
        modelsOptimized: 0,
        totalSizeReduction: 0,
        processingTime: 0,
      },
      streaming: {
        assetsStreamed: 0,
        averageLoadTime: 0,
        cacheHitRatio: 0,
        bandwidthUsage: 0,
        memoryUtilization: 0,
      },
      performance: {
        frameTime: 0,
        loadingHitches: 0,
        backgroundThreadUsage: 0,
      },
    };
  }

  private initializeWorkers(): void {
    // Create web workers for background processing
    if (typeof Worker !== 'undefined') {
      this.loadingWorker = new Worker(
        new URL('./workers/asset-loading-worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      this.preprocessingWorker = new Worker(
        new URL('./workers/asset-preprocessing-worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
  }

  // Asset preprocessing methods
  public async preprocessTexture(
    textureData: ArrayBuffer,
    options: {
      targetSize?: number;
      format?: 'webp' | 'avif' | 'jpg' | 'png';
      generateMipmaps?: boolean;
    } = {}
  ): Promise<ArrayBuffer> {
    const startTime = Date.now();
    
    if (this.preprocessingWorker) {
      return new Promise((resolve, reject) => {
        this.preprocessingWorker!.postMessage({
          type: 'processTexture',
          data: textureData,
          options,
        });
        
        this.preprocessingWorker!.onmessage = (event) => {
          if (event.data.type === 'textureProcessed') {
            this.metrics.preprocessing.texturesProcessed++;
            this.metrics.preprocessing.processingTime += Date.now() - startTime;
            resolve(event.data.result);
          }
        };
        
        this.preprocessingWorker!.onerror = reject;
      });
    }
    
    // Fallback to main thread processing
    return this.processTextureMainThread(textureData, options);
  }

  public async preprocessModel(
    modelData: ArrayBuffer,
    options: {
      compression?: 'draco' | 'meshopt';
      optimization?: boolean;
      generateLODs?: boolean;
    } = {}
  ): Promise<ArrayBuffer> {
    const startTime = Date.now();
    
    if (this.preprocessingWorker) {
      return new Promise((resolve, reject) => {
        this.preprocessingWorker!.postMessage({
          type: 'processModel',
          data: modelData,
          options,
        });
        
        this.preprocessingWorker!.onmessage = (event) => {
          if (event.data.type === 'modelProcessed') {
            this.metrics.preprocessing.modelsOptimized++;
            this.metrics.preprocessing.processingTime += Date.now() - startTime;
            resolve(event.data.result);
          }
        };
        
        this.preprocessingWorker!.onerror = reject;
      });
    }
    
    // Fallback to main thread processing
    return this.processModelMainThread(modelData, options);
  }

  // Streaming methods
  public registerStreamingAsset(
    id: string,
    config: {
      url: string;
      type: 'texture' | 'model' | 'audio';
      priority: number;
      spatialPosition?: THREE.Vector3;
      dependencies?: string[];
      estimatedSize: number;
    }
  ): void {
    const streamingAsset: StreamingAsset = {
      id,
      type: config.type,
      url: config.url,
      data: null,
      size: 0,
      loadTime: 0,
      lastAccessed: 0,
      refCount: 0,
      state: 'unloaded',
      priority: config.priority,
      lodLevel: 0,
      spatialPosition: config.spatialPosition,
      dependencies: config.dependencies || [],
      estimatedSize: config.estimatedSize,
    };
    
    this.streamingAssets.set(id, streamingAsset);
  }

  public updateSpatialPosition(position: THREE.Vector3): void {
    this.lastCameraPosition.copy(this.currentPosition);
    this.currentPosition.copy(position);
    
    // Calculate velocity for predictive loading
    this.cameraVelocity.subVectors(this.currentPosition, this.lastCameraPosition);
    
    this.updateStreamingPriorities();
  }

  private updateStreamingPriorities(): void {
    for (const [id, asset] of this.streamingAssets) {
      if (!asset.spatialPosition) continue;
      
      const distance = this.currentPosition.distanceTo(asset.spatialPosition);
      
      // Distance-based priority
      let priority = Math.max(0, 1 - (distance / this.streamingConfig.spatialLoading.loadDistance));
      
      // Predictive loading adjustment
      if (this.streamingConfig.predictive.enabled) {
        const predictedPosition = this.currentPosition.clone()
          .add(this.cameraVelocity.clone().multiplyScalar(this.streamingConfig.predictive.cameraVelocityWeight));
        const predictedDistance = predictedPosition.distanceTo(asset.spatialPosition);
        
        if (predictedDistance < distance) {
          priority *= 1.5; // Boost priority for assets we're moving towards
        }
      }
      
      // Priority zone adjustments
      for (const zone of this.streamingConfig.spatialLoading.priorityZones) {
        const zoneDistance = asset.spatialPosition.distanceTo(zone.center);
        if (zoneDistance <= zone.radius) {
          priority *= zone.priority;
        }
      }
      
      asset.priority = priority;
      
      // Queue for loading/unloading based on distance
      if (distance <= this.streamingConfig.spatialLoading.loadDistance && 
          asset.state === 'unloaded') {
        asset.state = 'queued';
        this.loadingQueue.push(asset);
      } else if (distance > this.streamingConfig.spatialLoading.unloadDistance && 
                 asset.state === 'loaded') {
        this.unloadAsset(id);
      }
    }
    
    // Sort loading queue by priority
    this.loadingQueue.sort((a, b) => b.priority - a.priority);
  }

  private async startStreamingLoop(): Promise<void> {
    const streamingLoop = async () => {
      // Process loading queue
      const maxConcurrentLoads = this.getMaxConcurrentLoads();
      const currentlyLoading = Array.from(this.streamingAssets.values())
        .filter(asset => asset.state === 'loading').length;
      
      const availableSlots = maxConcurrentLoads - currentlyLoading;
      
      for (let i = 0; i < Math.min(availableSlots, this.loadingQueue.length); i++) {
        const asset = this.loadingQueue.shift()!;
        this.loadStreamingAsset(asset);
      }
      
      // Update metrics
      this.updateMetrics();
      
      // Schedule next iteration
      setTimeout(streamingLoop, 16); // ~60fps
    };
    
    streamingLoop();
  }

  private getMaxConcurrentLoads(): number {
    // Adaptive loading based on network speed and device capabilities
    if (this.networkSpeed < this.streamingConfig.adaptive.bandwidthThresholds.slow) {
      return 2;
    } else if (this.networkSpeed < this.streamingConfig.adaptive.bandwidthThresholds.medium) {
      return 4;
    } else {
      return 8;
    }
  }

  private async loadStreamingAsset(asset: StreamingAsset): Promise<void> {
    asset.state = 'loading';
    const startTime = Date.now();
    
    try {
      // Load dependencies first
      await this.loadDependencies(asset.dependencies);
      
      // Choose appropriate quality level
      const quality = this.getAssetQuality(asset);
      const url = this.getQualityAdjustedUrl(asset.url!, quality);
      
      let loadedData: any;
      
      switch (asset.type) {
        case 'texture':
          loadedData = await this.assetManager.loadTexture(asset.id, url);
          break;
        case 'model':
          loadedData = await this.assetManager.loadModel(asset.id, url);
          break;
        case 'audio':
          loadedData = await this.assetManager.loadAudio(asset.id, url);
          break;
      }
      
      asset.data = loadedData;
      asset.loadTime = Date.now() - startTime;
      asset.state = 'loaded';
      asset.lastAccessed = Date.now();
      
      this.metrics.streaming.assetsStreamed++;
      
    } catch (error) {
      console.error(`Failed to load streaming asset ${asset.id}:`, error);
      asset.state = 'unloaded';
    }
  }

  private async loadDependencies(dependencies: string[]): Promise<void> {
    const loadPromises = dependencies.map(async (depId) => {
      const depAsset = this.streamingAssets.get(depId);
      if (depAsset && depAsset.state === 'unloaded') {
        return this.loadStreamingAsset(depAsset);
      }
    });
    
    await Promise.all(loadPromises);
  }

  private getAssetQuality(asset: StreamingAsset): 'low' | 'medium' | 'high' | 'ultra' {
    if (!this.streamingConfig.adaptive.enabled) {
      return 'high';
    }
    
    // Adjust quality based on distance, network speed, and device capabilities
    const distance = asset.spatialPosition ? 
      this.currentPosition.distanceTo(asset.spatialPosition) : 0;
    
    if (distance > 100 || this.networkSpeed < this.streamingConfig.adaptive.bandwidthThresholds.slow) {
      return 'low';
    } else if (distance > 50 || this.networkSpeed < this.streamingConfig.adaptive.bandwidthThresholds.medium) {
      return 'medium';
    } else if (this.networkSpeed >= this.streamingConfig.adaptive.bandwidthThresholds.fast) {
      return 'ultra';
    } else {
      return 'high';
    }
  }

  private getQualityAdjustedUrl(baseUrl: string, quality: string): string {
    // Modify URL to request appropriate quality variant
    // e.g., texture_1024.webp -> texture_512.webp for low quality
    const qualityMappings = {
      low: '_512',
      medium: '_1024',
      high: '_2048',
      ultra: '_4096',
    };
    
    const qualitySuffix = qualityMappings[quality as keyof typeof qualityMappings] || '_1024';
    return baseUrl.replace(/(_\d+)?(\.[^.]+)$/, `${qualitySuffix}$2`);
  }

  private unloadAsset(id: string): void {
    const asset = this.streamingAssets.get(id);
    if (!asset) return;
    
    if (asset.refCount > 0) {
      // Asset is still in use, just mark for eviction
      asset.state = 'evicted';
      return;
    }
    
    // Clean up asset data
    this.assetManager.releaseAsset(id);
    asset.data = null;
    asset.state = 'unloaded';
  }

  // Asset bundling
  public createBundle(
    id: string,
    assetIds: string[],
    options: {
      priority?: number;
      spatialBounds?: THREE.Box3;
    } = {}
  ): AssetBundle {
    const assets = assetIds.filter(id => this.streamingAssets.has(id));
    const totalSize = assets.reduce((sum, id) => {
      const asset = this.streamingAssets.get(id)!;
      return sum + asset.estimatedSize;
    }, 0);
    
    const bundle: AssetBundle = {
      id,
      assets,
      size: totalSize,
      priority: options.priority || 1,
      spatialBounds: options.spatialBounds,
    };
    
    this.bundles.set(id, bundle);
    return bundle;
  }

  public async loadBundle(bundleId: string): Promise<void> {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      throw new Error(`Bundle ${bundleId} not found`);
    }
    
    // Load all assets in the bundle concurrently
    const loadPromises = bundle.assets.map(assetId => {
      const asset = this.streamingAssets.get(assetId);
      if (asset && asset.state === 'unloaded') {
        return this.loadStreamingAsset(asset);
      }
    });
    
    await Promise.all(loadPromises);
  }

  // Network monitoring
  private startNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        this.networkSpeed = connection.downlink || 10; // Mbps
        
        // Adjust streaming config based on network
        if (this.streamingConfig.adaptive.enabled) {
          this.adjustStreamingForNetwork();
        }
      };
      
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }
  }

  private adjustStreamingForNetwork(): void {
    if (this.networkSpeed < this.streamingConfig.adaptive.bandwidthThresholds.slow) {
      this.adaptiveQuality = 'low';
      this.streamingConfig.spatialLoading.loadDistance *= 0.5;
    } else if (this.networkSpeed < this.streamingConfig.adaptive.bandwidthThresholds.medium) {
      this.adaptiveQuality = 'medium';
      this.streamingConfig.spatialLoading.loadDistance *= 0.75;
    } else {
      this.adaptiveQuality = 'high';
    }
  }

  // Performance monitoring
  private updateMetrics(): void {
    const cacheStats = this.assetManager.getCacheStats();
    
    this.metrics.streaming.memoryUtilization = 
      (cacheStats.totalSize / cacheStats.maxSize) * 100;
    
    // Calculate cache hit ratio
    const totalRequests = this.metrics.streaming.assetsStreamed;
    const cacheHits = Array.from(this.streamingAssets.values())
      .filter(asset => asset.state === 'cached').length;
    
    this.metrics.streaming.cacheHitRatio = 
      totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
  }

  // Main thread fallback processing (simplified)
  private async processTextureMainThread(
    data: ArrayBuffer, 
    options: any
  ): Promise<ArrayBuffer> {
    // Simplified texture processing
    // In a real implementation, you'd use ImageBitmap API or canvas
    return data;
  }

  private async processModelMainThread(
    data: ArrayBuffer, 
    options: any
  ): Promise<ArrayBuffer> {
    // Simplified model processing
    // In a real implementation, you'd use geometry optimization libraries
    return data;
  }

  // Public API
  public getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  public getStreamingStatus(): {
    loaded: number;
    loading: number;
    queued: number;
    unloaded: number;
  } {
    let loaded = 0, loading = 0, queued = 0, unloaded = 0;
    
    for (const asset of this.streamingAssets.values()) {
      switch (asset.state) {
        case 'loaded':
        case 'cached':
          loaded++;
          break;
        case 'loading':
          loading++;
          break;
        case 'queued':
          queued++;
          break;
        case 'unloaded':
        case 'evicted':
          unloaded++;
          break;
      }
    }
    
    return { loaded, loading, queued, unloaded };
  }

  public dispose(): void {
    this.loadingWorker?.terminate();
    this.preprocessingWorker?.terminate();
    this.assetManager.dispose();
  }
}

// Default configurations
export const DEFAULT_PIPELINE_CONFIG: AssetPipelineConfig = {
  textures: {
    compression: 'basis',
    mipmapGeneration: true,
    resizeTargets: [512, 1024, 2048, 4096],
    formats: ['webp', 'jpg'],
  },
  models: {
    compression: 'draco',
    optimization: {
      mergeGeometries: true,
      deduplicateVertices: true,
      quantization: true,
    },
    lodGeneration: {
      enabled: true,
      levels: [0.8, 0.6, 0.4, 0.2],
    },
  },
  audio: {
    compression: 'opus',
    bitrates: [128, 256, 320],
    spatialAudio: true,
  },
  buildTime: {
    atlasGeneration: true,
    shaderPrecompilation: true,
    assetBundling: true,
  },
};

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  spatialLoading: {
    enabled: true,
    loadDistance: 100,
    unloadDistance: 200,
    priorityZones: [],
  },
  lodStreaming: {
    enabled: true,
    distanceThresholds: [25, 50, 100, 200],
    qualityLevels: ['ultra', 'high', 'medium', 'low'],
  },
  predictive: {
    enabled: true,
    cameraVelocityWeight: 2.0,
    userBehaviorWeight: 1.5,
    preloadRadius: 50,
  },
  adaptive: {
    enabled: true,
    bandwidthThresholds: {
      slow: 1,   // 1 Mbps
      medium: 10, // 10 Mbps
      fast: 50,   // 50 Mbps
    },
    qualityAdjustment: true,
  },
  memory: {
    maxCacheSize: 1024 * 1024 * 1024, // 1GB
    priorityEviction: true,
    backgroundUnloading: true,
  },
};