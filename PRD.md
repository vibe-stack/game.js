# Three.js Game Framework - Complete Implementation Guide

## Project Structure

Key Design Decisions
File-based Routing: Each scene is its own TypeScript class in the file system, enabling efficient code splitting and organization at scale.
Hybrid Approach: Combines imperative Three.js code (familiar to developers) with declarative metadata (editor-friendly). The @Editable decorators mark properties that can be modified by your future editor.
Sidecar Metadata: Editor changes are saved to .editor.json files alongside scenes, keeping generated content separate from hand-written code.
Renderer Singleton: Global renderer management with runtime settings changes, as you requested.
Editor Integration Path
The framework is designed so your future Electron editor can:

Parse TypeScript to find @Editable decorators
Generate property inspectors for decorated fields
Save changes to metadata files instead of modifying code
Hot-reload individual properties without destroying scenes

Development Experience

Familiar patterns: File structure mirrors Next.js
Type safety: Full TypeScript support
Hot reloading: Vite handles fast refreshes
Scalable: Each scene is its own module

```
game.js/
├── packages/
│   ├── core/                    # Core framework
│   │   ├── src/
│   │   │   ├── scene/
│   │   │   │   ├── Scene.ts
│   │   │   │   └── decorators.ts
│   │   │   ├── router/
│   │   │   │   ├── Router.ts
│   │   │   │   └── RouteDiscovery.ts
│   │   │   ├── renderer/
│   │   │   │   └── RendererManager.ts
│   │   │   ├── assets/
│   │   │   │   └── AssetLoader.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── vite-plugin/             # Vite integration
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── route-generator.ts
│   │   │   └── hmr.ts
│   │   └── package.json
│   └── cli/                     # CLI tool
│       ├── src/
│       │   ├── commands/
│       │   │   ├── create.ts
│       │   │   ├── dev.ts
│       │   │   └── build.ts
│       │   └── index.ts
│       └── package.json
├── examples/
│   └── basic-game/
│       ├── src/
│       │   ├── app/
│       │   │   ├── scene.ts
│       │   │   ├── loading.ts
│       │   │   └── game/
│       │   │       └── scene.ts
│       │   └── components/
│       ├── public/
│       ├── package.json
│       ├── vite.config.ts
│       └── game.config.ts
└── package.json
```

## Core Framework Implementation

### 1. Scene Base Class (`packages/core/src/scene/Scene.ts`)

```typescript
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
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = this.getRenderer();
  }

  // Abstract methods - must be implemented
  abstract init(): Promise<void>;
  abstract update(deltaTime: number): void;
  abstract cleanup(): void;

  // Lifecycle hooks - optional
  onEnter?(): void;
  onExit?(): void;
  onResize?(width: number, height: number): void;

  // Parameter injection
  setParams(params: SceneParams): void {
    this.params = params;
  }

  // Metadata from editor
  setMetadata(metadata: SceneMetadata): void {
    this.metadata = metadata;
    this.applyMetadata();
  }

  protected applyMetadata(): void {
    // Apply editor overrides to decorated properties
    for (const [key, value] of Object.entries(this.metadata)) {
      if (this.hasOwnProperty(key)) {
        (this as any)[key] = value;
      }
    }
  }

  protected getRenderer(): THREE.WebGLRenderer {
    return (globalThis as any).__THREEJS_RENDERER__;
  }

  // Utility methods
  protected getCamera(): THREE.Camera {
    return this.camera;
  }

  protected getScene(): THREE.Scene {
    return this.scene;
  }
}
```

### 2. Decorators (`packages/core/src/scene/decorators.ts`)

```typescript
import 'reflect-metadata';

export interface EditableOptions {
  type?: 'number' | 'string' | 'boolean' | 'vector3' | 'color';
  min?: number;
  max?: number;
  step?: number;
  default?: any;
  label?: string;
  description?: string;
}

export function Editable(options: EditableOptions = {}) {
  return function (target: any, propertyKey: string) {
    const existingMetadata = Reflect.getMetadata('editable:properties', target) || [];
    existingMetadata.push({
      property: propertyKey,
      options
    });
    Reflect.defineMetadata('editable:properties', existingMetadata, target);
  };
}

export function SceneMetadata(metadataPath: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        this.loadMetadata(metadataPath);
      }

      private async loadMetadata(path: string) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const metadata = await response.json();
            (this as any).setMetadata(metadata);
          }
        } catch (error) {
          console.warn(`Could not load metadata from ${path}:`, error);
        }
      }
    };
  };
}
```

### 3. Router (`packages/core/src/router/Router.ts`)

```typescript
import { Scene, SceneParams } from '../scene/Scene';

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

    // Show loading if available
    this.showLoading();

    // Cleanup current scene
    if (this.currentScene) {
      this.currentScene.onExit?.();
      this.currentScene.cleanup();
    }

    // Load new scene
    const scene = await this.loadScene(route, path);
    
    // Apply route parameters
    const params = this.extractParams(route.path, path);
    scene.setParams(params);

    // Initialize scene
    await scene.init();
    scene.onEnter?.();

    this.currentScene = scene;
    this.currentPath = path;
    this.hideLoading();

    // Update browser history
    if (!replace) {
      window.history.pushState({ path }, '', path);
    }
  }

  private matchRoute(path: string): RouteConfig | null {
    // Exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path)!;
    }

    // Dynamic route matching
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
        return true; // Dynamic segment
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
    // Check cache first
    if (this.sceneCache.has(path)) {
      return this.sceneCache.get(path)!;
    }

    // Load scene module
    const module = await route.component();
    const SceneClass = module.default;
    const scene = new SceneClass();

    // Cache scene (optional - might want to limit cache size)
    this.sceneCache.set(path, scene);

    return scene;
  }

  private showLoading(): void {
    // Implementation depends on loading component
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

  back(): void {
    window.history.back();
  }

  forward(): void {
    window.history.forward();
  }

  // Animation loop
  animate(deltaTime: number): void {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }
}
```

### 4. Renderer Manager (`packages/core/src/renderer/RendererManager.ts`)

```typescript
import * as THREE from 'three';

export interface RendererSettings {
  antialias: boolean;
  shadows: boolean;
  physicallyCorrectLights: boolean;
  outputEncoding: THREE.TextureEncoding;
  toneMapping: THREE.ToneMapping;
  shadowMapType: THREE.ShadowMapType;
  pixelRatio: number;
  alpha: boolean;
  premultipliedAlpha: boolean;
}

export class RendererManager {
  private static instance: RendererManager;
  private renderer: THREE.WebGLRenderer;
  private settings: RendererSettings;
  private canvas: HTMLCanvasElement;

  private constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'threejs-canvas';
    document.body.appendChild(this.canvas);

    this.settings = {
      antialias: true,
      shadows: true,
      physicallyCorrectLights: true,
      outputEncoding: THREE.sRGBEncoding,
      toneMapping: THREE.ACESFilmicToneMapping,
      shadowMapType: THREE.PCFSoftShadowMap,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      alpha: false,
      premultipliedAlpha: true
    };

    this.initRenderer();
    this.setupEventListeners();
  }

  static getInstance(): RendererManager {
    if (!RendererManager.instance) {
      RendererManager.instance = new RendererManager();
    }
    return RendererManager.instance;
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.settings.antialias,
      alpha: this.settings.alpha,
      premultipliedAlpha: this.settings.premultipliedAlpha
    });

    this.applySettings();
    this.resize();

    // Make renderer globally available
    (globalThis as any).__THREEJS_RENDERER__ = this.renderer;
  }

  private applySettings(): void {
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = this.settings.shadowMapType;
    this.renderer.physicallyCorrectLights = this.settings.physicallyCorrectLights;
    this.renderer.outputEncoding = this.settings.outputEncoding;
    this.renderer.toneMapping = this.settings.toneMapping;
    this.renderer.setPixelRatio(this.settings.pixelRatio);
  }

  updateSettings(newSettings: Partial<RendererSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getSettings(): RendererSettings {
    return { ...this.settings };
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }
}
```

### 5. Vite Plugin (`packages/vite-plugin/src/index.ts`)

```typescript
import { Plugin } from 'vite';
import { glob } from 'fast-glob';
import path from 'path';
import fs from 'fs';

interface ThreeJSGameOptions {
  srcDir?: string;
  appDir?: string;
}

export default function threejsGamePlugin(options: ThreeJSGameOptions = {}): Plugin {
  const srcDir = options.srcDir || 'src';
  const appDir = options.appDir || 'app';
  const appPath = path.join(srcDir, appDir);

  return {
    name: 'game.js',
    buildStart() {
      this.generateRoutes();
    },
    configureServer(server) {
      // Watch for scene file changes
      server.ws.on('scene:reload', (data) => {
        server.ws.send('scene:reload', data);
      });
    },
    generateRoutes() {
      const sceneFiles = glob.sync(`${appPath}/**/scene.{ts,js}`, {
        ignore: ['**/node_modules/**']
      });

      const routes: string[] = [];

      sceneFiles.forEach(file => {
        const relativePath = path.relative(appPath, file);
        const routePath = this.filePathToRoute(relativePath);
        const importPath = path.relative(srcDir, file).replace(/\\/g, '/');
        
        routes.push(
          `router.registerRoute('${routePath}', () => import('../${importPath}'))`
        );
      });

      const routesContent = `
// Auto-generated routes
import { GameRouter } from '@game.js/core';

const router = GameRouter.getInstance();

${routes.join(';\n')};

export default router;
`;

      fs.writeFileSync(path.join(srcDir, 'routes.generated.ts'), routesContent);
    },

    filePathToRoute(filePath: string): string {
      // Convert file path to route
      // app/scene.ts -> /
      // app/game/scene.ts -> /game
      // app/[id]/scene.ts -> /[id]
      
      const parts = filePath.split(path.sep);
      parts.pop(); // Remove scene.ts
      
      if (parts.length === 0) {
        return '/';
      }
      
      return '/' + parts.join('/');
    }
  };
}
```

## Example Game Implementation

### Example Scene (`examples/basic-game/src/app/scene.ts`)

```typescript
import * as THREE from 'three';
import { Scene, Editable, SceneMetadata } from '@game.js/core';

@SceneMetadata('./scene.editor.json')
export default class HomeScene extends Scene {
  @Editable({ type: 'vector3', default: [0, 5, 10], label: 'Camera Position' })
  cameraPosition = [0, 5, 10];

  @Editable({ type: 'color', default: '#ffffff', label: 'Ambient Light Color' })
  ambientColor = '#ffffff';

  @Editable({ type: 'number', min: 0, max: 2, step: 0.1, default: 0.5, label: 'Ambient Intensity' })
  ambientIntensity = 0.5;

  private cube: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;

  async init(): Promise<void> {
    // Setup camera
    this.camera.position.set(...this.cameraPosition);
    this.camera.lookAt(0, 0, 0);

    // Create cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    // Setup lighting
    this.ambientLight = new THREE.AmbientLight(this.ambientColor, this.ambientIntensity);
    this.scene.add(this.ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  update(deltaTime: number): void {
    if (this.cube) {
      this.cube.rotation.x += deltaTime * 0.001;
      this.cube.rotation.y += deltaTime * 0.002;
    }

    // Update lighting if changed by editor
    if (this.ambientLight) {
      this.ambientLight.color.setHex(this.ambientColor);
      this.ambientLight.intensity = this.ambientIntensity;
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  cleanup(): void {
    if (this.cube) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
    }
    
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }
  }

  onEnter(): void {
    console.log('Entered home scene');
  }

  onExit(): void {
    console.log('Exited home scene');
  }
}
```

### Vite Config (`examples/basic-game/vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import threejsGame from '@game.js/vite-plugin';

export default defineConfig({
  plugins: [
    threejsGame({
      srcDir: 'src',
      appDir: 'app'
    })
  ],
  server: {
    port: 3000
  }
});
```

### Main Entry (`examples/basic-game/src/main.ts`)

```typescript
import { RendererManager, GameRouter } from '@game.js/core';
import './routes.generated';

class GameEngine {
  private router: GameRouter;
  private rendererManager: RendererManager;
  private lastTime = 0;

  constructor() {
    this.router = GameRouter.getInstance();
    this.rendererManager = RendererManager.getInstance();
    
    this.setupEventListeners();
    this.startGameLoop();
    
    // Navigate to initial route
    this.router.navigate(window.location.pathname);
  }

  private setupEventListeners(): void {
    // Handle browser navigation
    window.addEventListener('popstate', (event) => {
      if (event.state?.path) {
        this.router.navigate(event.state.path, true);
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.router.getCurrentScene?.()?.onResize) {
        this.router.getCurrentScene().onResize(window.innerWidth, window.innerHeight);
      }
    });
  }

  private startGameLoop(): void {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.router.animate(deltaTime);

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}

// Initialize the game
new GameEngine();
```

## Package Configuration

### Core Package (`packages/core/package.json`)

```json
{
  "name": "@game.js/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "three": "^0.177.0",
    "reflect-metadata": "^0.1.13"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/three": "^0.160.0"
  }
}
```

### Vite Plugin Package (`packages/vite-plugin/package.json`)

```json
{
  "name": "@game.js/vite-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "fast-glob": "^3.3.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "vite": "^5.0.0"
  }
}
```

## Getting Started Steps

1. **Setup monorepo structure**:
```bash
mkdir game.js-framework
cd game.js-framework
npm init -y
npm install -D lerna typescript
npx lerna init
```

2. **Create packages**:
```bash
mkdir -p packages/core/src packages/vite-plugin/src packages/cli/src
```

3. **Install dependencies**:
```bash
cd packages/core && npm init -y && npm install three reflect-metadata
cd ../vite-plugin && npm init -y && npm install fast-glob
```

4. **Build the packages**:
```bash
npx lerna run build
```

5. **Create example project**:
```bash
mkdir examples/basic-game
cd examples/basic-game
npm init -y
npm install @game.js/core @game.js/vite-plugin three vite
```

6. **Development workflow**:
```bash
# Terminal 1: Watch core package
cd packages/core && npm run dev

# Terminal 2: Run example
cd examples/basic-game && npm run dev
```

This structure gives you a solid foundation for your Three.js game framework with file-based routing, editor integration hooks, and a clear path to scaling up.