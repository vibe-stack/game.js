import * as THREE from "three/webgpu";
import { AssetManager } from "../asset-manager";
import { AssetPipeline } from "../asset-pipeline";
import { AssetPreloader, AssetLoadingPlan, AssetReference } from "./asset-preloader";
import { SceneData } from "./types";

export interface LoadingProgress {
  phase: 'analyzing' | 'loading' | 'applying' | 'complete';
  overallProgress: number;
  assetsLoaded: number;
  totalAssets: number;
  currentAsset?: string;
  loadingTimeMs: number;
  estimatedTimeRemainingMs: number;
}

export interface LoadingOptions {
  maxConcurrentLoads?: number;
  enableProgressiveLoading?: boolean;
  enablePlaceholders?: boolean;
  prioritizeVisibleAssets?: boolean;
  timeoutMs?: number;
}

export class ParallelAssetLoader {
  private assetManager: AssetManager;
  private assetPipeline: AssetPipeline;
  private assetPreloader: AssetPreloader;
  private loadingWorkers: Worker[] = [];
  private maxWorkers: number;
  
  // Loading state
  private currentLoadingPlan?: AssetLoadingPlan;
  private loadingProgress: LoadingProgress;
  private loadingStartTime: number = 0;
  private loadedAssets = new Map<string, any>();
  private failedAssets = new Map<string, Error>();
  private loadingPromises = new Map<string, Promise<any>>();
  
  // Progress callbacks
  private onProgressCallback?: (progress: LoadingProgress) => void;
  private onAssetLoadedCallback?: (assetId: string, asset: any) => void;
  private onErrorCallback?: (error: Error, assetId?: string) => void;

  constructor(
    assetManager: AssetManager,
    assetPipeline: AssetPipeline,
    options: { maxWorkers?: number } = {}
  ) {
    this.assetManager = assetManager;
    this.assetPipeline = assetPipeline;
    this.assetPreloader = new AssetPreloader(assetPipeline);
    this.maxWorkers = options.maxWorkers || Math.max(2, Math.floor(navigator.hardwareConcurrency / 2));
    
    this.loadingProgress = {
      phase: 'analyzing',
      overallProgress: 0,
      assetsLoaded: 0,
      totalAssets: 0,
      loadingTimeMs: 0,
      estimatedTimeRemainingMs: 0,
    };

    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    // Create web workers for parallel asset loading
    if (typeof Worker !== 'undefined') {
      for (let i = 0; i < this.maxWorkers; i++) {
        try {
          const worker = new Worker(
            new URL('../workers/asset-loading-worker.ts', import.meta.url),
            { type: 'module' }
          );
          
          worker.onmessage = this.handleWorkerMessage.bind(this);
          worker.onerror = this.handleWorkerError.bind(this);
          this.loadingWorkers.push(worker);
        } catch (error) {
          console.warn('Failed to create web worker:', error);
        }
      }
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, id, result, error, progress } = event.data;

    switch (type) {
      case 'assetLoaded':
        this.handleAssetLoaded(id, result);
        break;
      case 'loadError':
        this.handleAssetError(id, new Error(error));
        break;
      case 'loadProgress':
        this.handleAssetProgress(id, progress);
        break;
      case 'loadCancelled':
        this.handleAssetCancelled(id);
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    this.onErrorCallback?.(new Error(error.message));
  }

  private handleAssetLoaded(assetId: string, result: any): void {
    this.loadedAssets.set(assetId, result);
    this.loadingProgress.assetsLoaded++;
    this.updateProgress();
    this.onAssetLoadedCallback?.(assetId, result);
  }

  private handleAssetError(assetId: string, error: Error): void {
    this.failedAssets.set(assetId, error);
    this.loadingProgress.assetsLoaded++;
    this.updateProgress();
    this.onErrorCallback?.(error, assetId);
  }

  private handleAssetProgress(assetId: string, progress: number): void {
    // Update individual asset progress
    this.updateProgress();
  }

  private handleAssetCancelled(assetId: string): void {
    this.loadingPromises.delete(assetId);
    this.updateProgress();
  }

  /**
   * Loads all assets for a scene in parallel
   */
  async loadSceneAssets(
    sceneData: SceneData,
    projectPath: string,
    options: LoadingOptions = {}
  ): Promise<Map<string, any>> {
    const {
      maxConcurrentLoads = 8,
      enableProgressiveLoading = true,
      enablePlaceholders = true,
      prioritizeVisibleAssets = true,
      timeoutMs = 30000,
    } = options;

    this.loadingStartTime = Date.now();
    this.loadingProgress.phase = 'analyzing';
    this.updateProgress();

    try {
      // Phase 1: Analyze scene and create loading plan
      this.currentLoadingPlan = await this.assetPreloader.analyzeScene(sceneData, projectPath);
      this.loadingProgress.totalAssets = this.currentLoadingPlan.assets.length;
      this.loadingProgress.phase = 'loading';
      this.updateProgress();

      // Phase 2: Register assets with the pipeline for streaming
      await this.assetPreloader.registerAssetsForStreaming(this.currentLoadingPlan);

      // Phase 3: Load assets in parallel
      const loadedAssets = await this.loadAssetsInParallel(
        this.currentLoadingPlan,
        maxConcurrentLoads,
        enableProgressiveLoading,
        timeoutMs
      );

      // Phase 4: Apply loaded assets
      this.loadingProgress.phase = 'applying';
      this.updateProgress();

      // Create placeholder assets for failed loads if enabled
      if (enablePlaceholders) {
        this.createPlaceholderAssets(loadedAssets);
      }

      this.loadingProgress.phase = 'complete';
      this.loadingProgress.overallProgress = 100;
      this.updateProgress();

      return loadedAssets;

    } catch (error) {
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  private async loadAssetsInParallel(
    plan: AssetLoadingPlan,
    maxConcurrentLoads: number,
    enableProgressiveLoading: boolean,
    timeoutMs: number
  ): Promise<Map<string, any>> {
    const loadedAssets = new Map<string, any>();
    const { assets, criticalAssets } = plan;

    // Phase 1: Load critical assets first (blocking)
    const criticalAssetList = assets.filter(asset => criticalAssets.includes(asset.id));
    if (criticalAssetList.length > 0) {
      const criticalResults = await this.loadAssetBatch(
        criticalAssetList,
        Math.min(maxConcurrentLoads, criticalAssetList.length),
        timeoutMs
      );
      
      for (const [id, asset] of criticalResults) {
        loadedAssets.set(id, asset);
      }
    }

    // Phase 2: Load remaining assets in parallel
    const remainingAssets = assets.filter(asset => !criticalAssets.includes(asset.id));
    if (remainingAssets.length > 0) {
      if (enableProgressiveLoading) {
        // Load assets progressively without blocking
        this.loadAssetsProgressively(remainingAssets, maxConcurrentLoads, loadedAssets);
      } else {
        // Load all remaining assets before continuing
        const remainingResults = await this.loadAssetBatch(
          remainingAssets,
          maxConcurrentLoads,
          timeoutMs
        );
        
        for (const [id, asset] of remainingResults) {
          loadedAssets.set(id, asset);
        }
      }
    }

    return loadedAssets;
  }

  private async loadAssetBatch(
    assets: AssetReference[],
    maxConcurrent: number,
    timeoutMs: number
  ): Promise<Map<string, any>> {
    const loadedAssets = new Map<string, any>();
    const loadingQueue = [...assets];
    const activeLoads = new Set<Promise<void>>();

    while (loadingQueue.length > 0 || activeLoads.size > 0) {
      // Start new loads up to the concurrency limit
      while (loadingQueue.length > 0 && activeLoads.size < maxConcurrent) {
        const asset = loadingQueue.shift()!;
        const loadPromise = this.loadSingleAsset(asset, timeoutMs).then(result => {
          if (result) {
            loadedAssets.set(asset.id, result);
          }
        }).catch(error => {
          this.failedAssets.set(asset.id, error);
        }).finally(() => {
          activeLoads.delete(loadPromise);
        });
        
        activeLoads.add(loadPromise);
      }

      // Wait for at least one load to complete
      if (activeLoads.size > 0) {
        await Promise.race(activeLoads);
      }
    }

    return loadedAssets;
  }

  private async loadAssetsProgressively(
    assets: AssetReference[],
    maxConcurrent: number,
    loadedAssets: Map<string, any>
  ): void {
    // Start loading assets in the background without blocking
    const loadPromises: Promise<void>[] = [];
    
    for (let i = 0; i < assets.length; i += maxConcurrent) {
      const batch = assets.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (asset) => {
        try {
          const result = await this.loadSingleAsset(asset, 30000);
          if (result) {
            loadedAssets.set(asset.id, result);
            this.onAssetLoadedCallback?.(asset.id, result);
          }
        } catch (error) {
          this.failedAssets.set(asset.id, error as Error);
          this.onErrorCallback?.(error as Error, asset.id);
        }
      });
      
      loadPromises.push(...batchPromises);
    }

    // Don't await - let them load in the background
    Promise.all(loadPromises).catch(error => {
      console.error('Progressive loading error:', error);
    });
  }

  private async loadSingleAsset(asset: AssetReference, timeoutMs: number): Promise<any> {
    if (this.loadingPromises.has(asset.id)) {
      return this.loadingPromises.get(asset.id);
    }

    const loadPromise = this.loadAssetWithFallback(asset, timeoutMs);
    this.loadingPromises.set(asset.id, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(asset.id);
      return result;
    } catch (error) {
      this.loadingPromises.delete(asset.id);
      throw error;
    }
  }

  private async loadAssetWithFallback(asset: AssetReference, timeoutMs: number): Promise<any> {
    // Try to load using workers first
    if (this.loadingWorkers.length > 0) {
      try {
        return await this.loadAssetWithWorker(asset, timeoutMs);
      } catch (error) {
        console.warn(`Worker loading failed for ${asset.id}, falling back to main thread:`, error);
      }
    }

    // Fallback to main thread loading
    return await this.loadAssetMainThread(asset, timeoutMs);
  }

  private async loadAssetWithWorker(asset: AssetReference, timeoutMs: number): Promise<any> {
    // Find available worker
    const worker = this.loadingWorkers[0]; // Simple round-robin for now
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Asset loading timeout: ${asset.id}`));
      }, timeoutMs);

      const messageHandler = (event: MessageEvent) => {
        const { type, id, result, error } = event.data;
        
        if (id === asset.id) {
          clearTimeout(timeout);
          worker.removeEventListener('message', messageHandler);
          
          if (type === 'assetLoaded') {
            resolve(result);
          } else if (type === 'loadError') {
            reject(new Error(error));
          }
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        type: 'loadAsset',
        data: {
          id: asset.id,
          type: asset.type,
          url: asset.url,
          options: {},
        },
      });
    });
  }

  private async loadAssetMainThread(asset: AssetReference, timeoutMs: number): Promise<any> {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Asset loading timeout: ${asset.id}`)), timeoutMs);
    });

    const loadPromise = this.loadAssetByType(asset);
    
    return Promise.race([loadPromise, timeout]);
  }

  private async loadAssetByType(asset: AssetReference): Promise<any> {
    switch (asset.type) {
      case 'texture':
        return await this.loadTexture(asset);
      case 'model':
        return await this.loadModel(asset);
      case 'audio':
        return await this.loadAudio(asset);
      default:
        throw new Error(`Unsupported asset type: ${asset.type}`);
    }
  }

  private async loadTexture(asset: AssetReference): Promise<THREE.Texture> {
    try {
      // Use project API for proper asset loading
      const textureDataUrl = await (window as any).projectAPI.getAssetDataUrl(
        asset.projectPath,
        asset.url
      );
      
      if (!textureDataUrl) {
        throw new Error(`Failed to get texture data for ${asset.url}`);
      }

      // Convert data URL to blob URL for TextureLoader
      const response = await fetch(textureDataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const loader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(blobUrl, (loadedTexture) => {
          URL.revokeObjectURL(blobUrl);
          resolve(loadedTexture);
        }, undefined, (error) => {
          URL.revokeObjectURL(blobUrl);
          reject(error);
        });
      });

      return texture;
    } catch (error) {
      console.error(`Failed to load texture ${asset.id}:`, error);
      throw error;
    }
  }

  private async loadModel(asset: AssetReference): Promise<any> {
    try {
      const modelDataUrl = await (window as any).projectAPI.getAssetDataUrl(
        asset.projectPath,
        asset.url
      );
      
      if (!modelDataUrl) {
        throw new Error(`Failed to get model data for ${asset.url}`);
      }

      // Use AssetManager for model loading
      return await this.assetManager.loadModel(asset.id, modelDataUrl);
    } catch (error) {
      console.error(`Failed to load model ${asset.id}:`, error);
      throw error;
    }
  }

  private async loadAudio(asset: AssetReference): Promise<AudioBuffer> {
    try {
      const audioDataUrl = await (window as any).projectAPI.getAssetDataUrl(
        asset.projectPath,
        asset.url
      );
      
      if (!audioDataUrl) {
        throw new Error(`Failed to get audio data for ${asset.url}`);
      }

      // Use AssetManager for audio loading
      return await this.assetManager.loadAudio(asset.id, audioDataUrl);
    } catch (error) {
      console.error(`Failed to load audio ${asset.id}:`, error);
      throw error;
    }
  }

  private createPlaceholderAssets(loadedAssets: Map<string, any>): void {
    if (!this.currentLoadingPlan) return;

    for (const asset of this.currentLoadingPlan.assets) {
      if (!loadedAssets.has(asset.id) && !this.failedAssets.has(asset.id)) {
        // Create placeholder asset
        const placeholder = this.createPlaceholderAsset(asset);
        if (placeholder) {
          loadedAssets.set(asset.id, placeholder);
        }
      }
    }
  }

  private createPlaceholderAsset(asset: AssetReference): any {
    switch (asset.type) {
      case 'texture':
        // Create a simple colored texture as placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(canvas);
      
      case 'model':
        // Create a simple box geometry as placeholder
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
        return { scene: new THREE.Mesh(geometry, material) };
      
      case 'audio':
        // Create silent audio buffer as placeholder
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
      
      default:
        return null;
    }
  }

  private updateProgress(): void {
    const now = Date.now();
    this.loadingProgress.loadingTimeMs = now - this.loadingStartTime;
    
    if (this.loadingProgress.totalAssets > 0) {
      this.loadingProgress.overallProgress = Math.min(
        100,
        (this.loadingProgress.assetsLoaded / this.loadingProgress.totalAssets) * 100
      );
    }

    // Estimate remaining time based on current progress
    if (this.loadingProgress.assetsLoaded > 0) {
      const avgTimePerAsset = this.loadingProgress.loadingTimeMs / this.loadingProgress.assetsLoaded;
      const remainingAssets = this.loadingProgress.totalAssets - this.loadingProgress.assetsLoaded;
      this.loadingProgress.estimatedTimeRemainingMs = avgTimePerAsset * remainingAssets;
    }

    this.onProgressCallback?.(this.loadingProgress);
  }

  // Public API methods
  public onProgress(callback: (progress: LoadingProgress) => void): void {
    this.onProgressCallback = callback;
  }

  public onAssetLoaded(callback: (assetId: string, asset: any) => void): void {
    this.onAssetLoadedCallback = callback;
  }

  public onError(callback: (error: Error, assetId?: string) => void): void {
    this.onErrorCallback = callback;
  }

  public getLoadingProgress(): LoadingProgress {
    return { ...this.loadingProgress };
  }

  public getLoadedAssets(): Map<string, any> {
    return new Map(this.loadedAssets);
  }

  public getFailedAssets(): Map<string, Error> {
    return new Map(this.failedAssets);
  }

  public cancelLoading(): void {
    // Cancel all active loading operations
    for (const worker of this.loadingWorkers) {
      worker.postMessage({ type: 'cancelAll' });
    }
    
    this.loadingPromises.clear();
    this.loadingProgress.phase = 'complete';
    this.updateProgress();
  }

  public dispose(): void {
    this.cancelLoading();
    
    // Terminate workers
    for (const worker of this.loadingWorkers) {
      worker.terminate();
    }
    this.loadingWorkers.length = 0;
    
    // Clear caches
    this.loadedAssets.clear();
    this.failedAssets.clear();
    this.loadingPromises.clear();
    this.assetPreloader.clearLoadingPlans();
  }
} 