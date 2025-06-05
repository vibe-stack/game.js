import * as THREE from 'three';

export interface AssetManifest {
  textures?: Record<string, string>;
  models?: Record<string, string>;
  sounds?: Record<string, string>;
}

export class AssetLoader {
  private static instance: AssetLoader;
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  async loadTexture(path: string): Promise<THREE.Texture> {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)!;
    }

    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          this.textureCache.set(path, texture);
          this.loadingPromises.delete(path);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(path);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  async loadManifest(manifest: AssetManifest): Promise<void> {
    const promises: Promise<any>[] = [];

    if (manifest.textures) {
      for (const [key, path] of Object.entries(manifest.textures)) {
        promises.push(this.loadTexture(path));
      }
    }

    await Promise.all(promises);
  }

  getTexture(path: string): THREE.Texture | null {
    return this.textureCache.get(path) || null;
  }

  preloadAssets(paths: string[]): Promise<THREE.Texture[]> {
    return Promise.all(paths.map(path => this.loadTexture(path)));
  }

  clearCache(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
    this.loadingPromises.clear();
  }

  getCacheSize(): number {
    return this.textureCache.size;
  }
} 