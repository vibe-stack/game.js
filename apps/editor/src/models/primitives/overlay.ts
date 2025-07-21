import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { UIManager } from "../ui-manager/ui-manager";
import { UIOverlayConfig, UIAnchor } from "../ui-manager/types";
import { EntityData } from "../scene-loader";

export interface OverlayConfig {
  id?: string;
  content?: string | HTMLElement;
  anchor?: UIAnchor;
  offset?: { x: number; y: number };
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  autoHide?: boolean;
  autoHideDelay?: number;
  followMouse?: boolean;
  responsive?: boolean;
  interactive?: boolean;
  zIndex?: number;
}

export class Overlay extends Entity {
  private uiManager = UIManager.getInstance();
  private uiElement?: ReturnType<typeof this.uiManager.createOverlay>;
  private config: OverlayConfig;

  constructor(config: OverlayConfig = {}) {
    super();
    
    this.config = {
      id: config.id || `overlay-${Math.random().toString(36).substr(2, 9)}`,
      anchor: 'top-left',
      offset: { x: 0, y: 0 },
      autoHide: false,
      autoHideDelay: 3000,
      followMouse: false,
      responsive: true,
      interactive: true,
      zIndex: 1000,
      ...config,
    };

    this.createUIElement();
  }

  private createUIElement(): void {
    this.uiElement = this.uiManager.createOverlay({
      id: this.config.id!,
      type: 'overlay',
      content: this.config.content,
      className: this.config.className,
      style: this.config.style,
      anchor: this.config.anchor!,
      offset: this.config.offset,
      autoHide: this.config.autoHide,
      autoHideDelay: this.config.autoHideDelay,
      followMouse: this.config.followMouse,
      responsive: this.config.responsive,
      interactive: this.config.interactive,
      zIndex: this.config.zIndex,
      visible: this.visible,
    });
  }

  // Required Entity methods
  public serialize(): EntityData {
    return {
      ...this.serializeBase(),
      type: 'overlay',
      properties: this.config,
    };
  }

  public createCollider(config: any = {}): string | null {
    // Overlays don't have physics colliders
    return null;
  }

  // Proxy methods to UI element
  public setContent(content: string | HTMLElement): void {
    this.config.content = content;
    this.uiElement?.updateContent(content);
  }

  public setAnchor(anchor: UIAnchor): void {
    this.config.anchor = anchor;
    this.uiElement?.setAnchor(anchor);
  }

  public setOffset(offset: { x: number; y: number }): void {
    this.config.offset = offset;
    this.uiElement?.setOffset(offset);
  }

  public setFollowMouse(follow: boolean): void {
    this.config.followMouse = follow;
    this.uiElement?.setFollowMouse(follow);
  }

  public setAutoHide(autoHide: boolean, delay?: number): void {
    this.config.autoHide = autoHide;
    if (delay !== undefined) {
      this.config.autoHideDelay = delay;
    }
    this.uiElement?.setAutoHide(autoHide, delay);
  }

  public getDOMElement(): HTMLElement | undefined {
    return this.uiElement?.domElement;
  }

  public getUIElement(): ReturnType<typeof this.uiManager.createOverlay> | undefined {
    return this.uiElement;
  }

  public on(eventType: string, callback: (event: any) => void): void {
    this.uiElement?.on(eventType, callback);
  }

  public off(eventType: string, callback?: (event: any) => void): void {
    this.uiElement?.off(eventType, callback);
  }

  public setVisible(value: boolean): this {
    super.setVisible(value);
    this.uiElement?.setVisible(value);
    return this;
  }

  // Override dispose to clean up UI element
  public disposeEntity(): void {
    if (this.uiElement) {
      this.uiManager.removeElement(this.config.id!);
      this.uiElement = undefined;
    }
  }
}
