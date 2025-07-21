import * as THREE from "three/webgpu";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { UIElement, UIManagerConfig, UIOverlayConfig, UIWorldSpaceConfig, UITheme, UILayout, UIAnimation } from "./types";
import { UIOverlay } from "./ui-overlay";
import { UIWorldSpace } from "./ui-world-space";

export class UIManager {
  private static instance: UIManager;
  private elements = new Map<string, UIElement>();
  private css2DRenderer?: CSS2DRenderer;
  private css3DRenderer?: CSS3DRenderer;
  private css2DScene = new THREE.Scene();
  private css3DScene = new THREE.Scene();
  private overlayContainer?: HTMLElement;
  private camera?: THREE.Camera;
  private scene?: THREE.Scene;
  private currentTheme?: UITheme;
  private animationQueue: UIAnimation[] = [];
  private isAnimating = false;

  private config: UIManagerConfig = {
    enableOverlays: true,
    enableWorldSpace: true,
  };

  private constructor() {
    this.initialize();
  }

  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  private initialize(): void {
    this.setupOverlayContainer();
    this.setupRenderers();
    this.setupEventListeners();
  }

  public configure(config: Partial<UIManagerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.overlayContainer) {
      // Remove existing container if we created one
      if (this.overlayContainer && this.overlayContainer.id === 'ui-overlay-container' && this.overlayContainer.parentNode) {
        this.overlayContainer.parentNode.removeChild(this.overlayContainer);
      }
      
      // Use the provided container
      this.overlayContainer = config.overlayContainer;
      
      // Make sure the container has the proper styling for UI overlay
      this.overlayContainer.style.position = 'relative';
      this.overlayContainer.style.pointerEvents = 'none';
    }
    
    this.setupRenderers();
  }

  private setupOverlayContainer(): void {
    if (!this.overlayContainer) {
      this.overlayContainer = document.createElement('div');
      this.overlayContainer.id = 'ui-overlay-container';
      this.overlayContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(this.overlayContainer);
    }
  }

  private setupRenderers(): void {
    // Get dimensions from container or fallback to window
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    if (this.overlayContainer) {
      const rect = this.overlayContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = rect.width;
        height = rect.height;
      }
    }

    if (this.config.enableOverlays) {
      this.css2DRenderer = new CSS2DRenderer(this.config.css2DRendererSettings);
      this.css2DRenderer.setSize(width, height);
      this.css2DRenderer.domElement.style.position = 'absolute';
      this.css2DRenderer.domElement.style.top = '0';
      this.css2DRenderer.domElement.style.pointerEvents = 'none';
      
      if (this.overlayContainer) {
        this.overlayContainer.appendChild(this.css2DRenderer.domElement);
      }
    }

    if (this.config.enableWorldSpace) {
      this.css3DRenderer = new CSS3DRenderer(this.config.css3DRendererSettings);
      this.css3DRenderer.setSize(width, height);
      this.css3DRenderer.domElement.style.position = 'absolute';
      this.css3DRenderer.domElement.style.top = '0';
      this.css3DRenderer.domElement.style.pointerEvents = 'none';
      
      if (this.overlayContainer) {
        this.overlayContainer.appendChild(this.css3DRenderer.domElement);
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  public resize(width: number, height: number): void {
    if (this.css2DRenderer) {
      this.css2DRenderer.setSize(width, height);
    }

    if (this.css3DRenderer) {
      this.css3DRenderer.setSize(width, height);
    }
  }

  private handleResize(): void {
    // Get dimensions from container or fallback to window
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    if (this.overlayContainer) {
      const rect = this.overlayContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = rect.width;
        height = rect.height;
      }
    }

    if (this.css2DRenderer) {
      this.css2DRenderer.setSize(width, height);
    }

    if (this.css3DRenderer) {
      this.css3DRenderer.setSize(width, height);
    }
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    
    // Update world space elements with camera reference
    this.elements.forEach(element => {
      if (element instanceof UIWorldSpace) {
        element.setCamera(camera);
      }
    });
  }

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  // Create UI elements
  public createOverlay(config: UIOverlayConfig): UIOverlay {
    const overlay = new UIOverlay(config);
    this.elements.set(config.id, overlay);
    this.css2DScene.add(overlay.threeObject);
    
    overlay.emitEvent('mount');
    return overlay;
  }

  public createWorldSpaceUI(config: UIWorldSpaceConfig): UIWorldSpace {
    const worldSpaceUI = new UIWorldSpace(config);
    this.elements.set(config.id, worldSpaceUI);
    this.css3DScene.add(worldSpaceUI.threeObject);
    
    if (this.camera) {
      worldSpaceUI.setCamera(this.camera);
    }
    
    worldSpaceUI.emitEvent('mount');
    return worldSpaceUI;
  }

  // Utility methods for common UI patterns
  public createNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000): UIOverlay {
    const id = `notification-${Date.now()}`;
    const className = `ui-notification ui-notification--${type}`;
    
    const overlay = this.createOverlay({
      id,
      type: 'overlay',
      content: `<div class="${className}"><span>${message}</span></div>`,
      anchor: 'top-right',
      offset: { x: -20, y: 20 },
      autoHide: true,
      autoHideDelay: duration,
    });

    return overlay;
  }

  public createTooltip(target: THREE.Object3D, content: string): UIWorldSpace {
    const id = `tooltip-${Date.now()}`;
    
    const worldSpaceUI = this.createWorldSpaceUI({
      id,
      type: 'world-space',
      content: `<div class="ui-tooltip">${content}</div>`,
      position: target.position.clone(),
      followTarget: target,
      billboarding: true,
      distanceScaling: true,
      maxDistance: 50,
    });

    return worldSpaceUI;
  }

  public createHUD(elements: Array<{ content: string; anchor: UIOverlayConfig['anchor'] }>): UIOverlay[] {
    return elements.map((element, index) => {
      return this.createOverlay({
        id: `hud-element-${index}`,
        type: 'overlay',
        content: element.content,
        anchor: element.anchor,
        className: 'ui-hud-element',
      });
    });
  }

  public createProgressBar(progress: number, position: THREE.Vector3): UIWorldSpace {
    const id = `progress-${Date.now()}`;
    const content = `
      <div class="ui-progress-bar">
        <div class="ui-progress-fill" style="width: ${progress * 100}%"></div>
      </div>
    `;
    
    return this.createWorldSpaceUI({
      id,
      type: 'world-space',
      content,
      position,
      billboarding: true,
    });
  }

  // Element management
  public getElement(id: string): UIElement | undefined {
    return this.elements.get(id);
  }

  public removeElement(id: string): boolean {
    const element = this.elements.get(id);
    if (!element) return false;
    
    element.dispose();
    this.elements.delete(id);
    
    return true;
  }

  public removeAllElements(): void {
    this.elements.forEach(element => element.dispose());
    this.elements.clear();
  }

  public hideAllElements(): void {
    this.elements.forEach(element => element.setVisible(false));
  }

  public showAllElements(): void {
    this.elements.forEach(element => element.setVisible(true));
  }

  // Theme system
  public setTheme(theme: UITheme): void {
    this.currentTheme = theme;
    this.applyTheme();
  }

  private applyTheme(): void {
    if (!this.currentTheme) return;
    
    // Apply theme CSS custom properties
    const root = document.documentElement;
    
    Object.entries(this.currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--ui-color-${key}`, value);
    });
    
    Object.entries(this.currentTheme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--ui-font-${key}`, value);
    });
    
    Object.entries(this.currentTheme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--ui-spacing-${key}`, `${value}px`);
    });
  }

  // Animation system
  public animateElement(id: string, animations: UIAnimation[]): Promise<void> {
    const element = this.elements.get(id);
    if (!element) return Promise.reject(new Error(`Element ${id} not found`));
    
    return new Promise((resolve) => {
      animations.forEach(animation => {
        this.animationQueue.push({ ...animation, element });
      });
      
      if (!this.isAnimating) {
        this.processAnimationQueue().then(resolve);
      }
    });
  }

  private async processAnimationQueue(): Promise<void> {
    this.isAnimating = true;
    
    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift()!;
      await this.executeAnimation(animation);
    }
    
    this.isAnimating = false;
  }

  private executeAnimation(animation: UIAnimation): Promise<void> {
    return new Promise((resolve) => {
      // Simple CSS transition-based animation
      // For more complex animations, consider integrating with a library like GSAP
      const element = (animation as any).element.domElement;
      
      element.style.transition = `${animation.property} ${animation.duration}ms ${animation.easing || 'ease'}`;
      element.style[animation.property as any] = animation.to;
      
      setTimeout(() => {
        resolve();
      }, animation.duration + (animation.delay || 0));
    });
  }

  // Update cycle
  public update(deltaTime: number): void {
    // Update world space UI elements
    this.elements.forEach(element => {
      if (element instanceof UIWorldSpace) {
        element.update(deltaTime);
        
        // Check occlusion if enabled
        if (this.scene && element.occlusionTesting) {
          const isOccluded = element.checkOcclusion(this.scene);
          element.setVisible(!isOccluded && element.visible);
        }
      }
    });
  }

  // Render cycle
  public render(): void {
    if (!this.camera) return;
    
    if (this.css2DRenderer) {
      this.css2DRenderer.render(this.css2DScene, this.camera);
    }
    
    if (this.css3DRenderer) {
      this.css3DRenderer.render(this.css3DScene, this.camera);
    }
  }

  // Layout system
  public applyLayout(elementIds: string[], layout: UILayout): void {
    if (layout.type === 'flex') {
      this.applyFlexLayout(elementIds, layout);
    } else if (layout.type === 'grid') {
      this.applyGridLayout(elementIds, layout);
    }
  }

  private applyFlexLayout(elementIds: string[], layout: UILayout): void {
    elementIds.forEach(id => {
      const element = this.elements.get(id);
      if (!element) return;
      
      Object.assign(element.domElement.style, {
        display: 'flex',
        flexDirection: layout.direction || 'row',
        justifyContent: layout.justify || 'start',
        alignItems: layout.align || 'start',
        gap: layout.gap ? `${layout.gap}px` : '0',
        flexWrap: layout.wrap ? 'wrap' : 'nowrap',
      });
    });
  }

  private applyGridLayout(elementIds: string[], layout: UILayout): void {
    elementIds.forEach(id => {
      const element = this.elements.get(id);
      if (!element) return;
      
      Object.assign(element.domElement.style, {
        display: 'grid',
        gap: layout.gap ? `${layout.gap}px` : '0',
        justifyContent: layout.justify || 'start',
        alignItems: layout.align || 'start',
      });
    });
  }

  // React integration helpers
  public mountReactComponent(id: string, component: any, props?: any): void {
    const element = this.elements.get(id);
    if (!element) return;
    
    // This would require React integration
    // For now, this is a placeholder that shows the structure
    console.warn('React integration not implemented. Use DOM manipulation or integrate with React.');
  }

  // Cleanup
  public dispose(): void {
    this.removeAllElements();
    
    if (this.css2DRenderer?.domElement?.parentNode) {
      this.css2DRenderer.domElement.parentNode.removeChild(this.css2DRenderer.domElement);
    }
    
    if (this.css3DRenderer?.domElement?.parentNode) {
      this.css3DRenderer.domElement.parentNode.removeChild(this.css3DRenderer.domElement);
    }
    
    if (this.overlayContainer && this.overlayContainer.parentNode) {
      this.overlayContainer.parentNode.removeChild(this.overlayContainer);
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
