import * as THREE from "three/webgpu";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { UIElement, UIWorldSpaceConfig } from "./types";

export class UIWorldSpace extends UIElement {
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public scale: THREE.Vector3;
  public followTarget?: THREE.Object3D;
  public billboarding: boolean;
  public distanceScaling: boolean;
  public occlusionTesting: boolean;
  public maxDistance: number;
  public minDistance: number;
  
  private camera?: THREE.Camera;
  private raycaster = new THREE.Raycaster();
  private originalScale = new THREE.Vector3();

  constructor(config: UIWorldSpaceConfig) {
    super(config);
    
    this.position = config.position?.clone() ?? new THREE.Vector3();
    this.rotation = config.rotation?.clone() ?? new THREE.Euler();
    this.scale = config.scale?.clone() ?? new THREE.Vector3(1, 1, 1);
    this.followTarget = config.followTarget;
    this.billboarding = config.billboarding ?? false;
    this.distanceScaling = config.distanceScaling ?? false;
    this.occlusionTesting = config.occlusionTesting ?? false;
    this.maxDistance = config.maxDistance ?? Infinity;
    this.minDistance = config.minDistance ?? 0;
    
    this.originalScale.copy(this.scale);
    this.setupWorldSpaceSpecificStyles();
    this.updateTransform();
  }

  protected createThreeObject(): CSS3DObject {
    const css3DObject = new CSS3DObject(this.domElement);
    css3DObject.position.copy(this.position);
    css3DObject.rotation.copy(this.rotation);
    css3DObject.scale.copy(this.scale);
    return css3DObject;
  }

  private setupWorldSpaceSpecificStyles(): void {
    // Base 3D space styles
    Object.assign(this.domElement.style, {
      pointerEvents: this.interactive ? 'auto' : 'none',
      userSelect: 'none',
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'hidden',
    });
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public update(deltaTime: number): void {
    if (this.followTarget) {
      this.position.copy(this.followTarget.position);
      this.threeObject.position.copy(this.position);
    }

    if (this.billboarding && this.camera) {
      this.lookAtCamera();
    }

    if (this.distanceScaling && this.camera) {
      this.updateDistanceScaling();
    }

    if (this.occlusionTesting && this.camera) {
      this.updateOcclusion();
    }

    this.updateVisibilityByDistance();
  }

  private lookAtCamera(): void {
    if (!this.camera) return;
    
    const cameraPosition = this.camera.position.clone();
    this.threeObject.lookAt(cameraPosition);
  }

  private updateDistanceScaling(): void {
    if (!this.camera) return;
    
    const distance = this.camera.position.distanceTo(this.threeObject.position);
    const scaleFactor = Math.max(0.1, Math.min(2.0, distance / 10));
    
    const newScale = this.originalScale.clone().multiplyScalar(scaleFactor);
    this.threeObject.scale.copy(newScale);
  }

  private updateOcclusion(): void {
    if (!this.camera) return;
    
    // Cast ray from camera to UI element position
    const direction = this.threeObject.position.clone().sub(this.camera.position).normalize();
    this.raycaster.set(this.camera.position, direction);
    
    // Note: This would need access to the scene to check intersections
    // For now, we'll expose this as a method that can be called by the UIManager
    // with the scene as a parameter
  }

  public checkOcclusion(scene: THREE.Scene): boolean {
    if (!this.camera || !this.occlusionTesting) return false;
    
    const distance = this.camera.position.distanceTo(this.threeObject.position);
    const direction = this.threeObject.position.clone().sub(this.camera.position).normalize();
    this.raycaster.set(this.camera.position, direction);
    
    const intersects = this.raycaster.intersectObjects(scene.children, true);
    
    // Check if anything is blocking the view
    for (const intersect of intersects) {
      if (intersect.distance < distance && intersect.object !== this.threeObject) {
        return true; // Occluded
      }
    }
    
    return false; // Not occluded
  }

  private updateVisibilityByDistance(): void {
    if (!this.camera) return;
    
    const distance = this.camera.position.distanceTo(this.threeObject.position);
    const shouldBeVisible = distance >= this.minDistance && distance <= this.maxDistance;
    
    if (this.visible !== shouldBeVisible) {
      this.setVisible(shouldBeVisible);
    }
  }

  private updateTransform(): void {
    this.threeObject.position.copy(this.position);
    this.threeObject.rotation.copy(this.rotation);
    this.threeObject.scale.copy(this.scale);
  }

  public setPosition(position: THREE.Vector3): void {
    super.setPosition(position);
    this.position.copy(position);
  }

  public setRotation(rotation: THREE.Euler): void {
    super.setRotation(rotation);
    this.rotation.copy(rotation);
  }

  public setScale(scale: THREE.Vector3): void {
    super.setScale(scale);
    this.scale.copy(scale);
    this.originalScale.copy(scale);
  }

  public setFollowTarget(target: THREE.Object3D | undefined): void {
    this.followTarget = target;
  }

  public setBillboarding(enabled: boolean): void {
    this.billboarding = enabled;
  }

  public setDistanceScaling(enabled: boolean): void {
    this.distanceScaling = enabled;
  }

  public setOcclusionTesting(enabled: boolean): void {
    this.occlusionTesting = enabled;
  }

  public setDistanceRange(min: number, max: number): void {
    this.minDistance = min;
    this.maxDistance = max;
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.threeObject.position.clone();
  }

  public getScreenPosition(camera: THREE.Camera): THREE.Vector2 {
    const vector = this.threeObject.position.clone();
    vector.project(camera);
    
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    
    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;
    
    return new THREE.Vector2(vector.x, vector.y);
  }

  public isVisible(camera: THREE.Camera): boolean {
    if (!this.visible) return false;
    
    const screenPosition = this.getScreenPosition(camera);
    return screenPosition.x >= 0 && screenPosition.x <= window.innerWidth &&
           screenPosition.y >= 0 && screenPosition.y <= window.innerHeight;
  }
}
