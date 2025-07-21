import * as THREE from "three/webgpu";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

// UI Element types
export type UIType = "overlay" | "world-space";

export type UIAnchor = 
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right" 
  | "bottom-left" | "bottom-center" | "bottom-right";

export type UIAlignment = "start" | "center" | "end";

// Base UI configuration
export interface UIElementConfig {
  id: string;
  type: UIType;
  content?: string | HTMLElement;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  visible?: boolean;
  interactive?: boolean;
  zIndex?: number;
}

// Overlay-specific configuration
export interface UIOverlayConfig extends UIElementConfig {
  type: "overlay";
  anchor?: UIAnchor;
  offset?: { x: number; y: number };
  responsive?: boolean;
  followMouse?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// World space UI configuration
export interface UIWorldSpaceConfig extends UIElementConfig {
  type: "world-space";
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  followTarget?: THREE.Object3D;
  billboarding?: boolean;
  distanceScaling?: boolean;
  occlusionTesting?: boolean;
  maxDistance?: number;
  minDistance?: number;
}

// UI Event types
export interface UIEvent {
  type: "click" | "hover" | "focus" | "blur" | "mount" | "unmount";
  element: UIElement;
  originalEvent?: Event;
  position?: { x: number; y: number };
  worldPosition?: THREE.Vector3;
}

export type UIEventCallback = (event: UIEvent) => void;

// UI Element class
export abstract class UIElement {
  public id: string;
  public type: UIType;
  public domElement: HTMLElement;
  public threeObject: CSS2DObject | CSS3DObject;
  public visible: boolean = true;
  public interactive: boolean = true;
  protected eventCallbacks: Map<string, UIEventCallback[]> = new Map();

  constructor(config: UIElementConfig) {
    this.id = config.id;
    this.type = config.type;
    this.visible = config.visible ?? true;
    this.interactive = config.interactive ?? true;
    
    // Create DOM element
    this.domElement = this.createDOMElement(config);
    
    // Create Three.js object
    this.threeObject = this.createThreeObject();
    
    this.setupEventListeners();
  }

  protected createDOMElement(config: UIElementConfig): HTMLElement {
    let element: HTMLElement;
    
    if (config.content instanceof HTMLElement) {
      element = config.content;
    } else {
      element = document.createElement('div');
      element.innerHTML = config.content || '';
    }
    
    element.id = `ui-${config.id}`;
    
    if (config.className) {
      element.className = config.className;
    }
    
    if (config.style) {
      Object.assign(element.style, config.style);
    }
    
    if (config.zIndex !== undefined) {
      element.style.zIndex = config.zIndex.toString();
    }
    
    // Default styles for UI elements
    element.style.position = 'absolute';
    element.style.pointerEvents = this.interactive ? 'auto' : 'none';
    element.style.userSelect = 'none';
    
    return element;
  }

  protected abstract createThreeObject(): CSS2DObject | CSS3DObject;

  protected setupEventListeners(): void {
    if (!this.interactive) return;
    
    this.domElement.addEventListener('click', (e) => {
      this.emit('click', { originalEvent: e });
    });
    
    this.domElement.addEventListener('mouseenter', (e) => {
      this.emit('hover', { originalEvent: e });
    });
    
    this.domElement.addEventListener('focus', (e) => {
      this.emit('focus', { originalEvent: e });
    });
    
    this.domElement.addEventListener('blur', (e) => {
      this.emit('blur', { originalEvent: e });
    });
  }

  public on(eventType: string, callback: UIEventCallback): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
  }

  public off(eventType: string, callback?: UIEventCallback): void {
    if (!this.eventCallbacks.has(eventType)) return;
    
    if (callback) {
      const callbacks = this.eventCallbacks.get(eventType)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.eventCallbacks.set(eventType, []);
    }
  }

  protected emit(eventType: string, eventData: Partial<UIEvent> = {}): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (!callbacks) return;
    
    const event: UIEvent = {
      type: eventType as any,
      element: this,
      ...eventData
    };
    
    callbacks.forEach(callback => callback(event));
  }

  public emitEvent(eventType: string, eventData: Partial<UIEvent> = {}): void {
    this.emit(eventType, eventData);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.threeObject.visible = visible;
    this.domElement.style.display = visible ? '' : 'none';
  }

  public setPosition(position: THREE.Vector3): void {
    this.threeObject.position.copy(position);
  }

  public setRotation(rotation: THREE.Euler): void {
    this.threeObject.rotation.copy(rotation);
  }

  public setScale(scale: THREE.Vector3): void {
    this.threeObject.scale.copy(scale);
  }

  public updateContent(content: string | HTMLElement): void {
    if (typeof content === 'string') {
      this.domElement.innerHTML = content;
    } else {
      this.domElement.innerHTML = '';
      this.domElement.appendChild(content);
    }
  }

  public dispose(): void {
    this.emitEvent('unmount');
    this.eventCallbacks.clear();
    
    if (this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
    
    if (this.threeObject.parent) {
      this.threeObject.parent.remove(this.threeObject);
    }
  }
}

// UI Manager configuration
export interface UIManagerConfig {
  enableOverlays?: boolean;
  enableWorldSpace?: boolean;
  overlayContainer?: HTMLElement;
  css2DRendererSettings?: any;
  css3DRendererSettings?: any;
}

// Layout system types
export interface UILayout {
  type: "flex" | "grid" | "absolute";
  direction?: "row" | "column";
  justify?: "start" | "center" | "end" | "space-between" | "space-around";
  align?: "start" | "center" | "end" | "stretch";
  gap?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  wrap?: boolean;
}

// Animation system types
export interface UIAnimation {
  property: string;
  from: any;
  to: any;
  duration: number;
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | string;
  delay?: number;
  repeat?: number | "infinite";
  yoyo?: boolean;
  element?: UIElement; // Internal use for animation queue
}

// Responsive system types
export interface UIBreakpoint {
  name: string;
  minWidth: number;
  styles?: Partial<CSSStyleDeclaration>;
}

// Theme system types
export interface UITheme {
  name: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
  breakpoints: UIBreakpoint[];
}
