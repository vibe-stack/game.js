import * as THREE from "three/webgpu";
import { GameWorld } from "./game-world";
import { AssetManager, AssetManifest } from "./asset-manager";
import { Entity } from "./entity";

export interface SceneConfig {
  id: string;
  name: string;
  assetManifest?: AssetManifest;
  preload?: boolean;
  persistent?: boolean; // Keep scene in memory after switching away
}

export interface SceneTransition {
  type: 'fade' | 'slide' | 'crossfade' | 'instant';
  duration: number;
  easing?: (t: number) => number;
  color?: THREE.Color;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface SceneData {
  config: SceneConfig;
  scene: THREE.Scene;
  entities: Map<string, Entity>;
  cameras: Map<string, THREE.Camera>;
  isLoaded: boolean;
  isActive: boolean;
  loadPromise?: Promise<void>;
  setupCallback?: (sceneManager: SceneManager) => Promise<void> | void;
  cleanupCallback?: (sceneManager: SceneManager) => Promise<void> | void;
  updateCallback?: (delta: number, sceneManager: SceneManager) => void;
}

export class SceneManager {
  private scenes = new Map<string, SceneData>();
  private currentSceneId: string | null = null;
  private gameWorld: GameWorld;
  private assetManager: AssetManager;
  private isTransitioning = false;
  private transitionElement?: HTMLElement;

  constructor(gameWorld: GameWorld, assetManager: AssetManager) {
    this.gameWorld = gameWorld;
    this.assetManager = assetManager;
    this.createTransitionElement();
  }

  private createTransitionElement(): void {
    this.transitionElement = document.createElement('div');
    this.transitionElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: black;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(this.transitionElement);
  }

  public registerScene(
    config: SceneConfig,
    setupCallback?: (sceneManager: SceneManager) => Promise<void> | void,
    cleanupCallback?: (sceneManager: SceneManager) => Promise<void> | void,
    updateCallback?: (delta: number, sceneManager: SceneManager) => void
  ): void {
    const sceneData: SceneData = {
      config,
      scene: new THREE.Scene(),
      entities: new Map(),
      cameras: new Map(),
      isLoaded: false,
      isActive: false,
      setupCallback,
      cleanupCallback,
      updateCallback,
    };

    this.scenes.set(config.id, sceneData);

    // Auto-preload if configured
    if (config.preload) {
      this.preloadScene(config.id);
    }
  }

  public async preloadScene(sceneId: string): Promise<void> {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData || sceneData.isLoaded || sceneData.loadPromise) {
      return sceneData?.loadPromise;
    }

    const loadPromise = this.loadSceneAssets(sceneData);
    sceneData.loadPromise = loadPromise;
    
    try {
      await loadPromise;
      sceneData.isLoaded = true;
    } catch (error) {
      console.error(`Failed to preload scene ${sceneId}:`, error);
      throw error;
    } finally {
      sceneData.loadPromise = undefined;
    }
  }

  private async loadSceneAssets(sceneData: SceneData): Promise<void> {
    if (sceneData.config.assetManifest) {
      await this.assetManager.loadManifest(sceneData.config.assetManifest);
    }

    // Call setup callback if provided
    if (sceneData.setupCallback) {
      await sceneData.setupCallback(this);
    }
  }

  public async switchToScene(
    sceneId: string,
    transition: SceneTransition = { type: 'fade', duration: 500 }
  ): Promise<void> {
    if (this.isTransitioning) {
      throw new Error('Scene transition already in progress');
    }

    const targetScene = this.scenes.get(sceneId);
    if (!targetScene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    this.isTransitioning = true;

    try {
      // Start transition effect
      if (transition.type !== 'instant') {
        await this.startTransition(transition);
      }

      // Cleanup current scene
      if (this.currentSceneId) {
        await this.deactivateScene(this.currentSceneId);
      }

      // Load target scene if not already loaded
      if (!targetScene.isLoaded) {
        await this.preloadScene(sceneId);
      }

      // Activate new scene
      await this.activateScene(sceneId);

      // End transition effect
      if (transition.type !== 'instant') {
        await this.endTransition(transition);
      }

      this.currentSceneId = sceneId;
    } finally {
      this.isTransitioning = false;
    }
  }

  private async startTransition(transition: SceneTransition): Promise<void> {
    if (!this.transitionElement) return;

    return new Promise((resolve) => {
      const element = this.transitionElement!;
      
      // Set transition properties
      if (transition.color) {
        element.style.background = `#${transition.color.getHexString()}`;
      }
      
      element.style.transition = `opacity ${transition.duration}ms ${this.getEasingString(transition.easing)}`;
      element.style.opacity = '1';

      setTimeout(resolve, transition.duration / 2); // Transition halfway point
    });
  }

  private async endTransition(transition: SceneTransition): Promise<void> {
    if (!this.transitionElement) return;

    return new Promise((resolve) => {
      const element = this.transitionElement!;
      element.style.opacity = '0';
      setTimeout(resolve, transition.duration / 2);
    });
  }

  private getEasingString(_easing?: (t: number) => number): string {
    // Convert easing function to CSS easing (simplified)
    return 'ease';
  }

  private async activateScene(sceneId: string): Promise<void> {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) return;

    // Set the scene as active in GameWorld
    this.gameWorld.scene.clear();
    this.gameWorld.scene.copy(sceneData.scene);

    // Add entities to GameWorld
    sceneData.entities.forEach((entity, _entityId) => {
      this.gameWorld.scene.add(entity);
      // Optionally register entities with GameWorld's entity system
    });

    sceneData.isActive = true;
  }

  private async deactivateScene(sceneId: string): Promise<void> {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) return;

    sceneData.isActive = false;

    // Call cleanup callback
    if (sceneData.cleanupCallback) {
      await sceneData.cleanupCallback(this);
    }

    // Remove from memory if not persistent
    if (!sceneData.config.persistent) {
      this.unloadScene(sceneId);
    }
  }

  private unloadScene(sceneId: string): void {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) return;

    // Dispose entities
    sceneData.entities.forEach((entity) => {
      entity.destroy();
    });
    sceneData.entities.clear();

    // Clear scene
    sceneData.scene.clear();
    sceneData.isLoaded = false;

    // Release assets if not used by other scenes
    if (sceneData.config.assetManifest) {
      // This would need more sophisticated asset reference counting
      // For now, we rely on AssetManager's built-in reference counting
    }
  }

  // Scene entity management
  public addEntityToScene(sceneId: string, entity: Entity): void {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    sceneData.entities.set(entity.entityId, entity);
    sceneData.scene.add(entity);

    // If this is the active scene, also add to GameWorld
    if (sceneData.isActive) {
      this.gameWorld.scene.add(entity);
    }
  }

  public removeEntityFromScene(sceneId: string, entityId: string): boolean {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) return false;

    const entity = sceneData.entities.get(entityId);
    if (!entity) return false;

    sceneData.entities.delete(entityId);
    sceneData.scene.remove(entity);

    // If this is the active scene, also remove from GameWorld
    if (sceneData.isActive) {
      this.gameWorld.scene.remove(entity);
    }

    entity.destroy();
    return true;
  }

  public getSceneEntity(sceneId: string, entityId: string): Entity | undefined {
    const sceneData = this.scenes.get(sceneId);
    return sceneData?.entities.get(entityId);
  }

  // Camera management for scenes
  public addCameraToScene(sceneId: string, cameraId: string, camera: THREE.Camera): void {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    sceneData.cameras.set(cameraId, camera);
    sceneData.scene.add(camera);
  }

  public getSceneCamera(sceneId: string, cameraId: string): THREE.Camera | undefined {
    const sceneData = this.scenes.get(sceneId);
    return sceneData?.cameras.get(cameraId);
  }

  // Update loop integration
  public update(delta: number): void {
    if (this.currentSceneId) {
      const currentScene = this.scenes.get(this.currentSceneId);
      if (currentScene?.updateCallback) {
        currentScene.updateCallback(delta, this);
      }
    }
  }

  // Utility methods
  public getCurrentSceneId(): string | null {
    return this.currentSceneId;
  }

  public getCurrentScene(): SceneData | null {
    return this.currentSceneId ? this.scenes.get(this.currentSceneId) || null : null;
  }

  public isSceneLoaded(sceneId: string): boolean {
    return this.scenes.get(sceneId)?.isLoaded ?? false;
  }

  public getSceneLoadingProgress(sceneId: string): number {
    const sceneData = this.scenes.get(sceneId);
    if (!sceneData) return 0;
    if (sceneData.isLoaded) return 100;
    if (sceneData.loadPromise) return 50; // Simplified progress indication
    return 0;
  }

  public getRegisteredScenes(): SceneConfig[] {
    return Array.from(this.scenes.values()).map(sceneData => sceneData.config);
  }

  // Scene state queries
  public hasScene(sceneId: string): boolean {
    return this.scenes.has(sceneId);
  }

  public isTransitionInProgress(): boolean {
    return this.isTransitioning;
  }

  // Batch operations
  public async preloadMultipleScenes(sceneIds: string[]): Promise<void> {
    const promises = sceneIds.map(id => this.preloadScene(id));
    await Promise.all(promises);
  }

  public unloadUnusedScenes(): void {
    this.scenes.forEach((sceneData, sceneId) => {
      if (!sceneData.isActive && !sceneData.config.persistent) {
        this.unloadScene(sceneId);
      }
    });
  }

  // Cleanup
  public dispose(): void {
    // Cleanup all scenes
    this.scenes.forEach((sceneData) => {
      sceneData.entities.forEach((entity) => {
        entity.destroy();
      });
      sceneData.scene.clear();
    });
    this.scenes.clear();

    // Remove transition element
    if (this.transitionElement) {
      this.transitionElement.remove();
      this.transitionElement = undefined;
    }

    this.currentSceneId = null;
    this.isTransitioning = false;
  }
} 