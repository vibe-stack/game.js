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
