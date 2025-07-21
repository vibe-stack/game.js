import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { UIManager } from "../ui-manager/ui-manager";
import { UIWorldSpaceConfig } from "../ui-manager/types";
import { EntityData } from "../scene-loader";

export interface WorldSpaceUIConfig {
  id?: string;
  content?: string | HTMLElement;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  followTarget?: THREE.Object3D;
  billboarding?: boolean;
  distanceScaling?: boolean;
  occlusionTesting?: boolean;
  maxDistance?: number;
  minDistance?: number;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  interactive?: boolean;
  zIndex?: number;
}

export class WorldSpaceUI extends Entity {
  private uiManager = UIManager.getInstance();
  private uiElement?: ReturnType<typeof this.uiManager.createWorldSpaceUI>;
  private config: WorldSpaceUIConfig;

  constructor(config: WorldSpaceUIConfig = {}) {
    super();
    
    this.config = {
      id: config.id || `worldspace-ui-${Math.random().toString(36).substr(2, 9)}`,
      position: config.position?.clone() ?? new THREE.Vector3(),
      rotation: config.rotation?.clone() ?? new THREE.Euler(),
      scale: config.scale?.clone() ?? new THREE.Vector3(1, 1, 1),
      billboarding: false,
      distanceScaling: false,
      occlusionTesting: false,
      maxDistance: Infinity,
      minDistance: 0,
      interactive: true,
      zIndex: 1000,
      ...config,
    };

    // Update entity transform from config
    this.position.copy(this.config.position!);
    this.rotation.copy(this.config.rotation!);
    this.scale.copy(this.config.scale!);

    this.createUIElement();
  }

  private createUIElement(): void {
    this.uiElement = this.uiManager.createWorldSpaceUI({
      id: this.config.id!,
      type: 'world-space',
      content: this.config.content,
      className: this.config.className,
      style: this.config.style,
      position: this.config.position,
      rotation: this.config.rotation,
      scale: this.config.scale,
      followTarget: this.config.followTarget,
      billboarding: this.config.billboarding,
      distanceScaling: this.config.distanceScaling,
      occlusionTesting: this.config.occlusionTesting,
      maxDistance: this.config.maxDistance,
      minDistance: this.config.minDistance,
      interactive: this.config.interactive,
      zIndex: this.config.zIndex,
      visible: this.visible,
    });
  }

  // Required Entity methods
  public serialize(): EntityData {
    return {
      ...this.serializeBase(),
      type: 'world-space-ui',
      properties: {
        ...this.config,
        position: this.config.position ? {
          x: this.config.position.x,
          y: this.config.position.y,
          z: this.config.position.z,
        } : undefined,
        rotation: this.config.rotation ? {
          x: this.config.rotation.x,
          y: this.config.rotation.y,
          z: this.config.rotation.z,
        } : undefined,
        scale: this.config.scale ? {
          x: this.config.scale.x,
          y: this.config.scale.y,
          z: this.config.scale.z,
        } : undefined,
      },
    };
  }

  public createCollider(config: any = {}): string | null {
    // World space UI elements don't typically have physics colliders
    // But could be implemented for interaction purposes if needed
    return null;
  }

  // Proxy methods to UI element
  public setContent(content: string | HTMLElement): void {
    this.config.content = content;
    this.uiElement?.updateContent(content);
  }

  public setUIPosition(position: THREE.Vector3): void {
    this.config.position = position.clone();
    this.position.copy(position);
    this.uiElement?.setPosition(position);
  }

  public setUIRotation(rotation: THREE.Euler): void {
    this.config.rotation = rotation.clone();
    this.rotation.copy(rotation);
    this.uiElement?.setRotation(rotation);
  }

  public setUIScale(scale: THREE.Vector3): void {
    this.config.scale = scale.clone();
    this.scale.copy(scale);
    this.uiElement?.setScale(scale);
  }

  public setFollowTarget(target: THREE.Object3D | undefined): void {
    this.config.followTarget = target;
    this.uiElement?.setFollowTarget(target);
  }

  public setBillboarding(enabled: boolean): void {
    this.config.billboarding = enabled;
    this.uiElement?.setBillboarding(enabled);
  }

  public setDistanceScaling(enabled: boolean): void {
    this.config.distanceScaling = enabled;
    this.uiElement?.setDistanceScaling(enabled);
  }

  public setOcclusionTesting(enabled: boolean): void {
    this.config.occlusionTesting = enabled;
    this.uiElement?.setOcclusionTesting(enabled);
  }

  public setDistanceRange(min: number, max: number): void {
    this.config.minDistance = min;
    this.config.maxDistance = max;
    this.uiElement?.setDistanceRange(min, max);
  }

  public getDOMElement(): HTMLElement | undefined {
    return this.uiElement?.domElement;
  }

  public getUIElement(): ReturnType<typeof this.uiManager.createWorldSpaceUI> | undefined {
    return this.uiElement;
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.uiElement?.getWorldPosition() ?? this.position.clone();
  }

  public getScreenPosition(camera: THREE.Camera): THREE.Vector2 {
    return this.uiElement?.getScreenPosition(camera) ?? new THREE.Vector2();
  }

  public isUIVisible(camera: THREE.Camera): boolean {
    return this.uiElement?.isVisible(camera) ?? false;
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

  // Sync entity transform with UI element
  public updateMatrixWorld(force?: boolean): void {
    super.updateMatrixWorld(force);
    
    if (this.uiElement && !this.config.followTarget) {
      // Update UI element position when entity position changes
      this.uiElement.setPosition(this.position);
      this.uiElement.setRotation(this.rotation);
      this.uiElement.setScale(this.scale);
    }
  }

  // Override dispose to clean up UI element
  public disposeEntity(): void {
    if (this.uiElement) {
      this.uiManager.removeElement(this.config.id!);
      this.uiElement = undefined;
    }
  }
}
