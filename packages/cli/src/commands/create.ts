import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export async function createProject(projectName: string, template: string): Promise<void> {
  const projectPath = path.resolve(projectName);
  
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory ${projectName} already exists`);
  }

  console.log(chalk.blue(`Creating game.js project: ${projectName}`));
  
  await fs.ensureDir(projectPath);
  
  await createBasicTemplate(projectPath, projectName);
  
  console.log(chalk.green(`✅ Project ${projectName} created successfully!`));
  console.log(chalk.yellow(`\nNext steps:`));
  console.log(chalk.white(`  cd ${projectName}`));
  console.log(chalk.white(`  pnpm install`));
  console.log(chalk.white(`  pnpm dev`));
}

async function createBasicTemplate(projectPath: string, projectName: string): Promise<void> {
  // Ensure all directories exist first
  await fs.ensureDir(path.join(projectPath, 'src'));
  await fs.ensureDir(path.join(projectPath, 'src', 'app'));

  const packageJson = {
    "name": projectName,
    "version": "0.1.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "@game.js/core": "workspace:*",
      "three": "^0.177.0"
    },
    "devDependencies": {
      "@game.js/vite-plugin": "workspace:*",
      "typescript": "^5.8.2",
      "vite": "^5.0.0",
      "@types/three": "^0.160.0"
    }
  };

  const viteConfig = `import { defineConfig } from 'vite';
import gameJSPlugin from '@game.js/vite-plugin';

export default defineConfig({
  plugins: [
    gameJSPlugin({
      srcDir: 'src',
      appDir: 'app'
    })
  ],
  server: {
    port: 3000
  }
});
`;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <style>
      body { margin: 0; padding: 0; overflow: hidden; }
      #scene-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-family: Arial, sans-serif;
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="scene-loading">Loading...</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

  const mainTs = `import { RendererManager, GameRouter } from '@game.js/core';
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
    
    this.router.navigate(window.location.pathname);
  }

  private setupEventListeners(): void {
    window.addEventListener('popstate', (event) => {
      if (event.state?.path) {
        this.router.navigate(event.state.path, true);
      }
    });

    window.addEventListener('resize', () => {
      const currentScene = this.router.getCurrentScene();
      if (currentScene?.onResize) {
        currentScene.onResize(window.innerWidth, window.innerHeight);
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

new GameEngine();
`;

  const homeSceneTs = `import * as THREE from 'three';
import { Scene, Editable, SceneMetadataDecorator } from '@game.js/core';

@SceneMetadataDecorator('./scene.editor.json')
export default class HomeScene extends Scene {
  @Editable({ type: 'number', min: 0, max: 20, default: 5, label: 'Camera Y Position' })
  cameraY = 5;

  @Editable({ type: 'number', min: 0, max: 20, default: 10, label: 'Camera Z Position' })
  cameraZ = 10;

  @Editable({ type: 'color', default: '#00ff00', label: 'Cube Color' })
  cubeColor = '#00ff00';

  private cube: THREE.Mesh | null = null;

  async init(): Promise<void> {
    this.camera.position.set(0, this.cameraY, this.cameraZ);
    this.camera.lookAt(0, 0, 0);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: this.cubeColor });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    
    // Register the cube for editor manipulation
    this.registerObject('cube', this.cube);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    this.registerObject('ambientLight', ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    this.registerObject('directionalLight', directionalLight);
  }

  update(deltaTime: number): void {
    if (this.cube) {
      this.cube.rotation.x += deltaTime * 0.001;
      this.cube.rotation.y += deltaTime * 0.002;
      
      (this.cube.material as THREE.MeshPhongMaterial).color.setStyle(this.cubeColor);
    }

    this.camera.position.y = this.cameraY;
    this.camera.position.z = this.cameraZ;

    this.renderer.render(this.scene, this.camera);
  }

  cleanup(): void {
    if (this.cube) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
    }
  }

  onEnter(): void {
    console.log('Entered home scene');
  }

  onExit(): void {
    console.log('Exited home scene');
  }
}
`;

  const tsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;

  // Write all files
  await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
  await fs.writeFile(path.join(projectPath, 'vite.config.ts'), viteConfig);
  await fs.writeFile(path.join(projectPath, 'index.html'), indexHtml);
  await fs.writeFile(path.join(projectPath, 'tsconfig.json'), tsConfig);
  await fs.writeFile(path.join(projectPath, 'src', 'main.ts'), mainTs);
  await fs.writeFile(path.join(projectPath, 'src', 'app', 'scene.ts'), homeSceneTs);
  await fs.writeFile(path.join(projectPath, 'src', 'app', 'scene.editor.json'), '{}');
} 