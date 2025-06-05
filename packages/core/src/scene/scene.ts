import * as THREE from 'three';

export interface SceneParams {
  [key: string]: string;
}

export interface SceneMetadata {
  [key: string]: any;
}

export abstract class Scene {
  protected scene: THREE.Scene;
  protected camera: THREE.Camera;
  protected renderer: THREE.WebGLRenderer;
  protected params: SceneParams = {};
  protected metadata: SceneMetadata = {};

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.renderer = this.getRenderer();
  }

  abstract init(): Promise<void>;
  abstract update(deltaTime: number): void;
  abstract cleanup(): void;

  onEnter?(): void;
  onExit?(): void;
  onResize?(width: number, height: number): void;

  setParams(params: SceneParams): void {
    this.params = params;
  }

  setMetadata(metadata: SceneMetadata): void {
    this.metadata = metadata;
    this.applyMetadata();
  }

  protected applyMetadata(): void {
    for (const [key, value] of Object.entries(this.metadata)) {
      if (this.hasOwnProperty(key)) {
        (this as any)[key] = value;
      }
    }
  }

  protected getRenderer(): THREE.WebGLRenderer {
    return (globalThis as any).__THREEJS_RENDERER__;
  }

  protected getCamera(): THREE.Camera {
    return this.camera;
  }

  protected getScene(): THREE.Scene {
    return this.scene;
  }
} 