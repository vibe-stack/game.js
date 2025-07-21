import * as THREE from "three/webgpu";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { UIElement, UIOverlayConfig, UIAnchor } from "./types";

export class UIOverlay extends UIElement {
  public anchor: UIAnchor;
  public offset: { x: number; y: number };
  public responsive: boolean;
  public followMouse: boolean;
  public autoHide: boolean;
  public autoHideDelay: number;
  
  private autoHideTimeout?: NodeJS.Timeout;
  private mousePosition = { x: 0, y: 0 };

  constructor(config: UIOverlayConfig) {
    super(config);
    
    this.anchor = config.anchor ?? "top-left";
    this.offset = config.offset ?? { x: 0, y: 0 };
    this.responsive = config.responsive ?? true;
    this.followMouse = config.followMouse ?? false;
    this.autoHide = config.autoHide ?? false;
    this.autoHideDelay = config.autoHideDelay ?? 3000;
    
    this.setupOverlaySpecificStyles();
    this.setupOverlayBehavior();
  }

  protected createThreeObject(): CSS2DObject {
    return new CSS2DObject(this.domElement);
  }

  private setupOverlaySpecificStyles(): void {
    // Base overlay styles
    Object.assign(this.domElement.style, {
      position: 'fixed',
      pointerEvents: this.interactive ? 'auto' : 'none',
      userSelect: 'none',
      transition: 'all 0.2s ease',
    });

    this.updatePosition();
  }

  private setupOverlayBehavior(): void {
    if (this.followMouse) {
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    if (this.autoHide) {
      this.setupAutoHide();
    }

    if (this.responsive) {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mousePosition = { x: event.clientX, y: event.clientY };
    if (this.followMouse) {
      this.updatePosition();
    }
  }

  private handleResize(): void {
    if (this.responsive) {
      this.updatePosition();
    }
  }

  private setupAutoHide(): void {
    const resetAutoHide = () => {
      if (this.autoHideTimeout) {
        clearTimeout(this.autoHideTimeout);
      }
      
      this.setVisible(true);
      
      this.autoHideTimeout = setTimeout(() => {
        this.setVisible(false);
      }, this.autoHideDelay);
    };

    this.domElement.addEventListener('mouseenter', resetAutoHide);
    this.domElement.addEventListener('mouseleave', resetAutoHide);
    
    // Start auto-hide timer
    resetAutoHide();
  }

  private updatePosition(): void {
    const rect = this.domElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let x = 0;
    let y = 0;

    if (this.followMouse) {
      x = this.mousePosition.x;
      y = this.mousePosition.y;
    } else {
      // Calculate position based on anchor
      switch (this.anchor) {
        case "top-left":
          x = 0;
          y = 0;
          break;
        case "top-center":
          x = viewport.width / 2 - rect.width / 2;
          y = 0;
          break;
        case "top-right":
          x = viewport.width - rect.width;
          y = 0;
          break;
        case "center-left":
          x = 0;
          y = viewport.height / 2 - rect.height / 2;
          break;
        case "center":
          x = viewport.width / 2 - rect.width / 2;
          y = viewport.height / 2 - rect.height / 2;
          break;
        case "center-right":
          x = viewport.width - rect.width;
          y = viewport.height / 2 - rect.height / 2;
          break;
        case "bottom-left":
          x = 0;
          y = viewport.height - rect.height;
          break;
        case "bottom-center":
          x = viewport.width / 2 - rect.width / 2;
          y = viewport.height - rect.height;
          break;
        case "bottom-right":
          x = viewport.width - rect.width;
          y = viewport.height - rect.height;
          break;
      }
    }

    // Apply offset
    x += this.offset.x;
    y += this.offset.y;

    // Ensure element stays within viewport bounds
    if (this.responsive) {
      x = Math.max(0, Math.min(x, viewport.width - rect.width));
      y = Math.max(0, Math.min(y, viewport.height - rect.height));
    }

    this.domElement.style.left = `${x}px`;
    this.domElement.style.top = `${y}px`;
  }

  public setAnchor(anchor: UIAnchor): void {
    this.anchor = anchor;
    this.updatePosition();
  }

  public setOffset(offset: { x: number; y: number }): void {
    this.offset = offset;
    this.updatePosition();
  }

  public setFollowMouse(follow: boolean): void {
    this.followMouse = follow;
    if (follow) {
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
    this.updatePosition();
  }

  public setAutoHide(autoHide: boolean, delay?: number): void {
    this.autoHide = autoHide;
    if (delay !== undefined) {
      this.autoHideDelay = delay;
    }

    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = undefined;
    }

    if (autoHide) {
      this.setupAutoHide();
    }
  }

  public dispose(): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    super.dispose();
  }
}
