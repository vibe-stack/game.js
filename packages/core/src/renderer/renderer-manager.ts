import * as THREE from 'three';

export interface RendererSettings {
  antialias: boolean;
  shadows: boolean;
  outputEncoding: THREE.TextureEncoding;
  toneMapping: THREE.ToneMapping;
  shadowMapType: THREE.ShadowMapType;
  pixelRatio: number;
  alpha: boolean;
  premultipliedAlpha: boolean;
}

export class RendererManager {
  private static instance: RendererManager;
  private renderer!: THREE.WebGLRenderer;
  private settings: RendererSettings;
  private canvas: HTMLCanvasElement;

  private constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'threejs-canvas';
    document.body.appendChild(this.canvas);

    this.settings = {
      antialias: true,
      shadows: true,
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

    (globalThis as any).__THREEJS_RENDERER__ = this.renderer;
  }

  private applySettings(): void {
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = this.settings.shadowMapType;
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

  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
} 