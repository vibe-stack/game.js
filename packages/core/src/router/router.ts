import { Scene, SceneParams } from '../scene/scene.js';

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

  static getInstance(): GameRouter {
    if (!GameRouter.instance) {
      GameRouter.instance = new GameRouter();
    }
    return GameRouter.instance;
  }

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
      this.currentScene.cleanup();
    }

    const scene = await this.loadScene(route, path);
    
    const params = this.extractParams(route.path, path);
    scene.setParams(params);

    await scene.init();
    scene.onEnter?.();

    this.currentScene = scene;
    this.currentPath = path;
    this.hideLoading();

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
      return this.sceneCache.get(path)!;
    }

    const module = await route.component();
    const SceneClass = module.default;
    const scene = new SceneClass();

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