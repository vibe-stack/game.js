import * as THREE from "three/webgpu";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export interface AssetManifest {
  textures: Record<string, string>;
  models: Record<string, string>;
  audio: Record<string, string>;
  fonts: Record<string, string>;
  materials: Record<string, MaterialDefinition>;
}

export interface MaterialDefinition {
  type: 'standard' | 'basic' | 'physical' | 'custom';
  properties: Record<string, any>;
  textures?: Record<string, string>;
}

export interface LoadingProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentItem?: string;
}

export interface AssetData {
  id: string;
  type: 'texture' | 'model' | 'audio' | 'font' | 'material';
  url?: string;
  data: any;
  size: number;
  loadTime: number;
  lastAccessed: number;
  refCount: number;
}

export class AssetManager {
  private assets = new Map<string, AssetData>();
  private loadingPromises = new Map<string, Promise<any>>();
  private loadingManager: THREE.LoadingManager;
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;
  private audioLoader: THREE.AudioLoader;
  private dracoLoader: DRACOLoader;
  
  private onProgress?: (progress: LoadingProgress) => void;
  private onError?: (error: Error, assetId: string) => void;
  
  // Cache settings
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private currentCacheSize = 0;

  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.audioLoader = new THREE.AudioLoader(this.loadingManager);
    
    // Setup DRACO loader for compressed models
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/'); // Adjust path as needed
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.setupLoadingManager();
  }

  private setupLoadingManager(): void {
    this.loadingManager.onLoad = () => {
      // All assets loaded
    };

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      if (this.onProgress) {
        this.onProgress({
          total: itemsTotal,
          loaded: itemsLoaded,
          percentage: (itemsLoaded / itemsTotal) * 100,
          currentItem: url,
        });
      }
    };

    this.loadingManager.onError = (url) => {
      if (this.onError) {
        this.onError(new Error(`Failed to load asset: ${url}`), url);
      }
    };
  }

  public setProgressCallback(callback: (progress: LoadingProgress) => void): void {
    this.onProgress = callback;
  }

  public setErrorCallback(callback: (error: Error, assetId: string) => void): void {
    this.onError = callback;
  }

  public async loadManifest(manifest: AssetManifest): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    // Load textures
    Object.entries(manifest.textures).forEach(([id, url]) => {
      loadPromises.push(this.loadTexture(id, url).then(() => {}));
    });

    // Load models
    Object.entries(manifest.models).forEach(([id, url]) => {
      loadPromises.push(this.loadModel(id, url).then(() => {}));
    });

    // Load audio
    Object.entries(manifest.audio).forEach(([id, url]) => {
      loadPromises.push(this.loadAudio(id, url).then(() => {}));
    });

    // Create materials
    Object.entries(manifest.materials).forEach(([id, definition]) => {
      loadPromises.push(this.createMaterial(id, definition).then(() => {}));
    });

    await Promise.all(loadPromises);
  }

  public async loadTexture(id: string, url: string): Promise<THREE.Texture> {
    if (this.assets.has(id)) {
      const asset = this.assets.get(id)!;
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data;
    }

    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const startTime = Date.now();
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          const loadTime = Date.now() - startTime;
          const size = this.estimateTextureSize(texture);
          
          const assetData: AssetData = {
            id,
            type: 'texture',
            url,
            data: texture,
            size,
            loadTime,
            lastAccessed: Date.now(),
            refCount: 1,
          };

          this.assets.set(id, assetData);
          this.currentCacheSize += size;
          this.checkCacheSize();
          this.loadingPromises.delete(id);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(id);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(id, promise);
    return promise;
  }

  public async loadModel(id: string, url: string): Promise<GLTF> {
    if (this.assets.has(id)) {
      const asset = this.assets.get(id)!;
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data;
    }

    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const startTime = Date.now();
    const promise = new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const loadTime = Date.now() - startTime;
          const size = this.estimateModelSize(gltf);
          
          const assetData: AssetData = {
            id,
            type: 'model',
            url,
            data: gltf,
            size,
            loadTime,
            lastAccessed: Date.now(),
            refCount: 1,
          };

          this.assets.set(id, assetData);
          this.currentCacheSize += size;
          this.checkCacheSize();
          this.loadingPromises.delete(id);
          resolve(gltf);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(id);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(id, promise);
    return promise;
  }

  public async loadAudio(id: string, url: string): Promise<AudioBuffer> {
    if (this.assets.has(id)) {
      const asset = this.assets.get(id)!;
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data;
    }

    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const startTime = Date.now();
    const promise = new Promise<AudioBuffer>((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => {
          const loadTime = Date.now() - startTime;
          const size = buffer.length * buffer.numberOfChannels * 4; // Estimate size
          
          const assetData: AssetData = {
            id,
            type: 'audio',
            url,
            data: buffer,
            size,
            loadTime,
            lastAccessed: Date.now(),
            refCount: 1,
          };

          this.assets.set(id, assetData);
          this.currentCacheSize += size;
          this.checkCacheSize();
          this.loadingPromises.delete(id);
          resolve(buffer);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(id);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(id, promise);
    return promise;
  }

  public async createMaterial(id: string, definition: MaterialDefinition): Promise<THREE.Material> {
    if (this.assets.has(id)) {
      const asset = this.assets.get(id)!;
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data.clone(); // Clone materials to avoid shared state issues
    }

    let material: THREE.Material;

    switch (definition.type) {
      case 'standard':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'basic':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'physical':
        material = new THREE.MeshPhysicalMaterial();
        break;
      default:
        throw new Error(`Unsupported material type: ${definition.type}`);
    }

    // Apply properties
    Object.entries(definition.properties).forEach(([key, value]) => {
      if (key in material) {
        (material as any)[key] = value;
      }
    });

    // Load and apply textures
    if (definition.textures) {
      const texturePromises = Object.entries(definition.textures).map(async ([property, textureId]) => {
        const texture = await this.getTexture(textureId);
        if (texture && property in material) {
          (material as any)[property] = texture;
        }
      });

      await Promise.all(texturePromises);
    }

    const assetData: AssetData = {
      id,
      type: 'material',
      data: material,
      size: 1024, // Estimate material size
      loadTime: 0,
      lastAccessed: Date.now(),
      refCount: 1,
    };

    this.assets.set(id, assetData);
    this.currentCacheSize += assetData.size;

    return material.clone();
  }

  // Getter methods
  public getTexture(id: string): THREE.Texture | null {
    const asset = this.assets.get(id);
    if (asset && asset.type === 'texture') {
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data;
    }
    return null;
  }

  public getModel(id: string): GLTF | null {
    const asset = this.assets.get(id);
    if (asset && asset.type === 'model') {
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data;
    }
    return null;
  }

  public getAudio(id: string): AudioBuffer | null {
    const asset = this.assets.get(id);
    if (asset && asset.type === 'audio') {
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data;
    }
    return null;
  }

  public getMaterial(id: string): THREE.Material | null {
    const asset = this.assets.get(id);
    if (asset && asset.type === 'material') {
      asset.lastAccessed = Date.now();
      asset.refCount++;
      return asset.data.clone(); // Always clone materials
    }
    return null;
  }

  // Cache management
  private checkCacheSize(): void {
    if (this.currentCacheSize > this.maxCacheSize) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    // Sort assets by last accessed time and reference count
    const sortedAssets = Array.from(this.assets.entries()).sort(([, a], [, b]) => {
      if (a.refCount === 0 && b.refCount > 0) return -1;
      if (a.refCount > 0 && b.refCount === 0) return 1;
      return a.lastAccessed - b.lastAccessed;
    });

    // Remove least recently used assets until we're under the limit
    while (this.currentCacheSize > this.maxCacheSize * 0.8) {
      const [id, asset] = sortedAssets.shift()!;
      if (asset.refCount === 0) {
        this.disposeAsset(asset);
        this.assets.delete(id);
        this.currentCacheSize -= asset.size;
      } else {
        break; // Don't remove assets that are still in use
      }
    }
  }

  private disposeAsset(asset: AssetData): void {
    if (asset.data && typeof asset.data.dispose === 'function') {
      asset.data.dispose();
    }
  }

  // Size estimation helpers
  private estimateTextureSize(texture: THREE.Texture): number {
    if (texture.image) {
      const width = texture.image.width || 256;
      const height = texture.image.height || 256;
      const channels = 4; // RGBA
      return width * height * channels;
    }
    return 256 * 256 * 4; // Default estimate
  }

  private estimateModelSize(gltf: GLTF): number {
    let size = 0;
    
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        if (geometry.attributes.position) {
          size += geometry.attributes.position.array.byteLength;
        }
        if (geometry.attributes.normal) {
          size += geometry.attributes.normal.array.byteLength;
        }
        if (geometry.attributes.uv) {
          size += geometry.attributes.uv.array.byteLength;
        }
        if (geometry.index) {
          size += geometry.index.array.byteLength;
        }
      }
    });

    return size || 1024; // Default estimate if calculation fails
  }

  // Reference counting
  public releaseAsset(id: string): void {
    const asset = this.assets.get(id);
    if (asset) {
      asset.refCount = Math.max(0, asset.refCount - 1);
    }
  }

  // Statistics
  public getCacheStats(): {
    totalAssets: number;
    totalSize: number;
    maxSize: number;
    utilizationPercentage: number;
    assetsByType: Record<string, number>;
  } {
    const assetsByType: Record<string, number> = {};
    
    for (const asset of this.assets.values()) {
      assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;
    }

    return {
      totalAssets: this.assets.size,
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      utilizationPercentage: (this.currentCacheSize / this.maxCacheSize) * 100,
      assetsByType,
    };
  }

  // Cleanup
  public dispose(): void {
    // Dispose all assets
    for (const asset of this.assets.values()) {
      this.disposeAsset(asset);
    }
    
    this.assets.clear();
    this.loadingPromises.clear();
    this.currentCacheSize = 0;
    
    // Dispose loaders
    this.dracoLoader.dispose();
  }
} 