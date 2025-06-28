import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface CameraEntityConfig extends EntityConfig {
  cameraType: "perspective" | "orthographic";
  // Perspective camera properties
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  // Orthographic camera properties
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  // Common properties
  target?: THREE.Vector3;
  isActive?: boolean;
}

export abstract class Camera extends Entity {
  public readonly camera: THREE.Camera;
  public readonly cameraType: string;
  private _target: THREE.Object3D;
  public isActive: boolean = false;

  constructor(config: CameraEntityConfig) {
    super(config);
    this.cameraType = config.cameraType;
    this.metadata.type = "camera";
    this.camera = this.createCamera(config);
    this.camera.name = this.entityName;
    this.add(this.camera);
    
    // Create target object for camera to look at
    this._target = new THREE.Object3D();
    this.add(this._target);
    
    // Set target position if provided
    if (config.target) {
      this.setTarget(config.target);
    } else {
      this.setTarget(new THREE.Vector3(0, 0, 0));
    }
    
    this.isActive = config.isActive ?? false;
  }

  protected abstract createCamera(config: CameraEntityConfig): THREE.Camera;

  public setTarget(target: THREE.Vector3) {
    this._target.position.copy(target);
    this.camera.lookAt(this._target.position);
  }

  public getTarget(): THREE.Vector3 {
    return this._target.position.clone();
  }

  public setActive(active: boolean) {
    this.isActive = active;
    this.emitChange();
  }

  protected createCollider() {} // Cameras don't have physics colliders

  serialize(): EntityData {
    return {
      id: this.entityId,
      name: this.entityName,
      type: "camera",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      userData: { ...this.userData },
      tags: [...this.metadata.tags],
      layer: this.metadata.layer,
      scripts: this.serializeScripts(),
      properties: {
        type: this.cameraType,
        target: {
          x: this._target.position.x,
          y: this._target.position.y,
          z: this._target.position.z
        },
        isActive: this.isActive
      }
    };
  }
}

export class PerspectiveCamera extends Camera {
  public readonly perspectiveCamera: THREE.PerspectiveCamera;

  constructor(config: Omit<CameraEntityConfig, "cameraType"> = {}) {
    super({ ...config, cameraType: "perspective" });
    this.perspectiveCamera = this.camera as THREE.PerspectiveCamera;
  }

  protected createCamera(config: CameraEntityConfig): THREE.Camera {
    return new THREE.PerspectiveCamera(
      config.fov ?? 75,
      config.aspect ?? 16 / 9,
      config.near ?? 0.1,
      config.far ?? 1000
    );
  }

  public setFov(fov: number): this {
    this.perspectiveCamera.fov = fov;
    this.perspectiveCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setAspect(aspect: number): this {
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setNear(near: number): this {
    this.perspectiveCamera.near = near;
    this.perspectiveCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setFar(far: number): this {
    this.perspectiveCamera.far = far;
    this.perspectiveCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public getFov(): number {
    return this.perspectiveCamera.fov;
  }

  public getAspect(): number {
    return this.perspectiveCamera.aspect;
  }

  public getNear(): number {
    return this.perspectiveCamera.near;
  }

  public getFar(): number {
    return this.perspectiveCamera.far;
  }

  serialize(): EntityData {
    const baseData = super.serialize();
    return {
      ...baseData,
      properties: {
        ...baseData.properties,
        fov: this.perspectiveCamera.fov,
        aspect: this.perspectiveCamera.aspect,
        near: this.perspectiveCamera.near,
        far: this.perspectiveCamera.far
      }
    };
  }
}

export class OrthographicCamera extends Camera {
  public readonly orthographicCamera: THREE.OrthographicCamera;

  constructor(config: Omit<CameraEntityConfig, "cameraType"> = {}) {
    super({ ...config, cameraType: "orthographic" });
    this.orthographicCamera = this.camera as THREE.OrthographicCamera;
  }

  protected createCamera(config: CameraEntityConfig): THREE.Camera {
    return new THREE.OrthographicCamera(
      config.left ?? -10,
      config.right ?? 10,
      config.top ?? 10,
      config.bottom ?? -10,
      config.near ?? 0.1,
      config.far ?? 1000
    );
  }

  public setLeft(left: number): this {
    this.orthographicCamera.left = left;
    this.orthographicCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setRight(right: number): this {
    this.orthographicCamera.right = right;
    this.orthographicCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setTop(top: number): this {
    this.orthographicCamera.top = top;
    this.orthographicCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setBottom(bottom: number): this {
    this.orthographicCamera.bottom = bottom;
    this.orthographicCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setNear(near: number): this {
    this.orthographicCamera.near = near;
    this.orthographicCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public setFar(far: number): this {
    this.orthographicCamera.far = far;
    this.orthographicCamera.updateProjectionMatrix();
    this.emitChange();
    return this;
  }

  public getLeft(): number {
    return this.orthographicCamera.left;
  }

  public getRight(): number {
    return this.orthographicCamera.right;
  }

  public getTop(): number {
    return this.orthographicCamera.top;
  }

  public getBottom(): number {
    return this.orthographicCamera.bottom;
  }

  public getNear(): number {
    return this.orthographicCamera.near;
  }

  public getFar(): number {
    return this.orthographicCamera.far;
  }

  serialize(): EntityData {
    const baseData = super.serialize();
    return {
      ...baseData,
      properties: {
        ...baseData.properties,
        left: this.orthographicCamera.left,
        right: this.orthographicCamera.right,
        top: this.orthographicCamera.top,
        bottom: this.orthographicCamera.bottom,
        near: this.orthographicCamera.near,
        far: this.orthographicCamera.far
      }
    };
  }
} 