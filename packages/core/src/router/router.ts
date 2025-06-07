import { Scene, SceneParams } from '../scene/scene.js';
import * as THREE from 'three';

interface RouteConfig {
  path: string;
  component: () => Promise<{ default: new() => Scene }>;
  params?: SceneParams;
}

export class GameRouter {
  private static instance: GameRouter;
  private routes: Map<string, RouteConfig> = new Map();
  private currentScene: Scene | null = null;
  private currentPath: string = '/';
  private sceneCache: Map<string, Scene> = new Map();

  private constructor() {
    // Listen for property updates for cached scenes in development
    if (this.isDevelopment()) {
      this.setupCachedSceneUpdates();
    }
  }

  static getInstance(): GameRouter {
    if (!GameRouter.instance) {
      GameRouter.instance = new GameRouter();
    }
    return GameRouter.instance;
  }

  // === DEVELOPMENT-ONLY CACHED SCENE UPDATES ===
  
  private isDevelopment(): boolean {
    try {
      return typeof import.meta !== 'undefined' && 
             import.meta.env !== undefined && 
             import.meta.env.DEV === true;
    } catch {
      return false;
    }
  }

  private setupCachedSceneUpdates(): void {
    if (typeof window !== 'undefined' && (window as any).__vite_ws) {
      const viteWs = (window as any).__vite_ws;
      
      viteWs.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'custom' && data.event === 'cached-scene-update') {
            console.log('🔄 Received cached scene update:', data.data);
            this.applyCachedSceneUpdate(data.data);
          }
        } catch (error) {
          // Ignore non-JSON messages
        }
      });
    }
  }

  private applyCachedSceneUpdate(update: any): void {
    if (!update.routePath || !update.property) {
      console.warn('🔄 Invalid cached scene update:', update);
      return;
    }

    // Find the cached scene for this route
    const cachedScene = this.sceneCache.get(update.routePath);
    if (!cachedScene) {
      console.log(`🔄 No cached scene found for route: ${update.routePath}`);
      return;
    }

    console.log(`🔄 Applying update to cached scene ${update.routePath}: ${update.property} = ${JSON.stringify(update.value)}`);

    // Apply the update to the cached scene
    if (update.property.startsWith('objects.')) {
      const pathParts = update.property.split('.');
      const objectName = pathParts[1];
      const propertyPath = pathParts.slice(2);
      
      const obj = cachedScene.getObject?.(objectName);
      if (obj) {
        this.applyObjectPropertyUpdate(obj, propertyPath, update.value);
      }
    } else if (cachedScene.hasOwnProperty(update.property)) {
      // Handle scene-level property updates
      (cachedScene as any)[update.property] = update.value;
    }

    // Also update the scene's editor overrides for persistence
    if (typeof cachedScene.setEditorOverrides === 'function') {
      const currentOverrides = cachedScene.getEditorOverrides?.() || {};
      const newOverrides = { ...currentOverrides };
      this.setNestedProperty(newOverrides, update.property, update.value);
      cachedScene.setEditorOverrides(newOverrides);
    }
  }

  private applyObjectPropertyUpdate(obj: any, propertyPath: string[], value: any): void {
    const property = propertyPath.join('.');
    
    switch (property) {
      case 'position':
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          obj.position.set(value.x, value.y, value.z);
        }
        break;
        
      case 'rotation':
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          obj.rotation.set(value.x, value.y, value.z);
        }
        break;
        
      case 'scale':
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          obj.scale.set(value.x, value.y, value.z);
        }
        break;
        
      case 'matrix':
        if (Array.isArray(value) && value.length === 16) {
          obj.matrix.fromArray(value);
          obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
        }
        break;
        
      case 'visible':
        obj.visible = Boolean(value);
        break;
        
      case 'material.color':
        if (obj instanceof THREE?.Mesh && obj.material) {
          const material = obj.material as any;
          if (material.color) {
            const colorValue = typeof value === 'string' ? 
              parseInt(value.replace('#', ''), 16) : value;
            material.color.setHex(colorValue);
          }
        }
        break;
        
      default:
        this.setNestedProperty(obj, property, value);
        break;
    }
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
  }

  // === END DEVELOPMENT-ONLY METHODS ===

  registerRoute(path: string, component: () => Promise<{ default: new() => Scene }>) {
    this.routes.set(path, { path, component });
  }

  async navigate(path: string, replace: boolean = false): Promise<void> {
    const route = this.matchRoute(path);
    if (!route) {
      throw new Error(`Route not found: ${path}`);
    }

    this.showLoading();

    if (this.currentScene) {
      this.currentScene.onExit?.();
      this.currentScene.clearObjectRegistry();
      this.currentScene.cleanup();
    }

    const scene = await this.loadScene(route, path);
    
    const params = this.extractParams(route.path, path);
    scene.setParams(params);

    await scene.internalInit();
    scene.onEnter?.();

    this.currentScene = scene;
    this.currentPath = path;
    this.hideLoading();

    // Notify editor that scene switch is complete (development only)
    if (typeof window !== 'undefined' && (window as any).__vite_ws) {
      try {
        const message = {
          type: 'custom',
          event: 'scene-switch-complete',
          data: { 
            path,
            timestamp: Date.now()
          }
        };
        (window as any).__vite_ws.send(JSON.stringify(message));
        console.log('🎬 Notified editor that scene switch is complete:', path);
      } catch (error) {
        console.warn('Failed to notify editor of scene switch:', error);
      }
    }

    if (!replace) {
      window.history.pushState({ path }, '', path);
    }
  }

  private matchRoute(path: string): RouteConfig | null {
    if (this.routes.has(path)) {
      return this.routes.get(path)!;
    }

    for (const [routePath, config] of this.routes) {
      if (this.isMatch(routePath, path)) {
        return config;
      }
    }

    return null;
  }

  private isMatch(routePath: string, actualPath: string): boolean {
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');

    if (routeParts.length !== actualParts.length) {
      return false;
    }

    return routeParts.every((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return true;
      }
      return part === actualParts[index];
    });
  }

  private extractParams(routePath: string, actualPath: string): SceneParams {
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');
    const params: SceneParams = {};

    routeParts.forEach((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const paramName = part.slice(1, -1);
        params[paramName] = actualParts[index];
      }
    });

    return params;
  }

  private async loadScene(route: RouteConfig, path: string): Promise<Scene> {
    if (this.sceneCache.has(path)) {
      const cachedScene = this.sceneCache.get(path)!;
      console.log(`♻️ Reusing cached scene instance for path: ${path}`);
      // Clear any stale editor state from previous use
      cachedScene.clearObjectRegistry();
      // Update route path for cached scenes
      cachedScene.setRoutePath(path);
      return cachedScene;
    }

    console.log(`🏗️ Creating new scene instance for path: ${path}`);
    const module = await route.component();
    const SceneClass = module.default;
    const scene = new SceneClass();

    // Set the route path for metadata loading
    scene.setRoutePath(path);

    this.sceneCache.set(path, scene);

    return scene;
  }

  private showLoading(): void {
    const loadingElement = document.getElementById('scene-loading');
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
  }

  private hideLoading(): void {
    const loadingElement = document.getElementById('scene-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  back(): void {
    window.history.back();
  }

  forward(): void {
    window.history.forward();
  }

  animate(deltaTime: number): void {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }
} 