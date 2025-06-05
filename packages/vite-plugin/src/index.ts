import { Plugin, ViteDevServer } from 'vite';
import fastGlob from 'fast-glob';
import path from 'path';
import fs from 'fs';

const { glob } = fastGlob;

interface GameJSPluginOptions {
  srcDir?: string;
  appDir?: string;
}

export default function gameJSPlugin(options: GameJSPluginOptions = {}): Plugin {
  const srcDir = options.srcDir || 'src';
  const appDir = options.appDir || 'app';
  const appPath = path.join(srcDir, appDir);

  const generateRoutes = () => {
    const sceneFiles = glob.sync(`${appPath}/**/scene.{ts,js}`, {
      ignore: ['**/node_modules/**']
    });

    const routes: string[] = [];

    sceneFiles.forEach((file: string) => {
      const relativePath = path.relative(appPath, file);
      const routePath = filePathToRoute(relativePath);
      const importPath = './' + path.relative(srcDir, file).replace(/\\/g, '/');
      
      routes.push(
        `router.registerRoute('${routePath}', () => import('${importPath}'))`
      );
    });

    const routesContent = `
// Auto-generated routes
import { GameRouter } from '@game.js/core';

const router = GameRouter.getInstance();

${routes.join(';\n')};

export default router;
`;

    const outputPath = path.join(srcDir, 'routes.generated.ts');
    fs.writeFileSync(outputPath, routesContent);
  };

  const filePathToRoute = (filePath: string): string => {
    const parts = filePath.split(path.sep);
    parts.pop(); // Remove scene.ts
    
    if (parts.length === 0) {
      return '/';
    }
    
    return '/' + parts.join('/');
  };

  return {
    name: 'game.js',
    buildStart() {
      generateRoutes();
    },
    configureServer(server: ViteDevServer) {
      server.ws.on('scene:reload', (_data: any) => {
        server.ws.send('scene:reload', _data);
      });
    }
  };
} 