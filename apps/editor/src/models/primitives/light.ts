import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { EntityData } from "../scene-loader";

export interface LightConfig extends EntityConfig {
  lightType: "ambient" | "directional" | "point" | "spot";
  color?: THREE.ColorRepresentation;
  intensity?: number;
  distance?: number;
  angle?: number;
  penumbra?: number;
  decay?: number;
  castShadow?: boolean;
  target?: THREE.Vector3;
  // Shadow bias properties for WebGPU
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowRadius?: number;
}

export abstract class Light extends Entity {
  public readonly light: THREE.Light;
  public readonly lightType: string;

  constructor(config: LightConfig) {
    super(config);
    this.lightType = config.lightType;
    this.metadata.type = "light";
    this.light = this.createLight(config);
    this.light.name = this.entityName;
    this.add(this.light);
    
    if (config.castShadow && 'castShadow' in this.light) {
      (this.light as any).castShadow = true;
      this.configureShadows(config);
    }
  }

  protected abstract createLight(config: LightConfig): THREE.Light;
  
  protected configureShadows(config: LightConfig) {
    const shadowLight = this.light as any;
    // Shadow object is created lazily when castShadow is set to true
    // We need to ensure it exists before configuring
    if (!shadowLight.shadow) {
      return;
    }
    
    // WebGPU shadow bias configuration to prevent shadow acne
    shadowLight.shadow.bias = config.shadowBias ?? -0.0001;
    shadowLight.shadow.normalBias = config.shadowNormalBias ?? 0.02;
    shadowLight.shadow.radius = config.shadowRadius ?? 4;
    
    // Set shadow map size for better quality
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;
  }
  
  protected createCollider() {} // Lights don't have physics colliders
  
  serialize(): EntityData {
    return {
      id: this.entityId, name: this.entityName, type: "light",
      transform: {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      visible: this.visible, castShadow: this.castShadow, receiveShadow: this.receiveShadow,
      userData: { ...this.userData }, tags: [...this.metadata.tags], layer: this.metadata.layer,
      properties: {
        type: this.lightType,
        color: `#${this.light.color.getHexString()}`,
        intensity: this.light.intensity
      }
    };
  }
}

export class AmbientLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "ambient" });
  }
  
  protected createLight(config: LightConfig): THREE.Light {
    return new THREE.AmbientLight(config.color ?? 0x404040, config.intensity ?? 0.4);
  }
  
  // Ambient lights don't cast shadows, so override to prevent configuration
  protected configureShadows(config: LightConfig) {
    // No-op for ambient lights
  }
  
  setColor(color: THREE.ColorRepresentation) {
    this.light.color.set(color);
  }
  
  setIntensity(intensity: number) {
    this.light.intensity = intensity;
  }
}

export class DirectionalLight extends Light {
  public readonly directionalLight: THREE.DirectionalLight;
  private _target: THREE.Object3D;
  
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "directional" });
    this.directionalLight = this.light as THREE.DirectionalLight;
    this._target = new THREE.Object3D();
    this.add(this._target);
    this.directionalLight.target = this._target;
    
    if (config.target) {
      this.setTarget(config.target);
    }
  }
  
  protected createLight(config: LightConfig): THREE.Light {
    return new THREE.DirectionalLight(config.color ?? 0xffffff, config.intensity ?? 1);
  }
  
  protected configureShadows(config: LightConfig) {
    super.configureShadows(config);
    if (!this.directionalLight?.shadow) {
      return;
    }
    
    // Configure shadow camera for directional light
    const shadowCamera = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
    shadowCamera.left = -50;
    shadowCamera.right = 50;
    shadowCamera.top = 50;
    shadowCamera.bottom = -50;
    shadowCamera.near = 0.1;
    shadowCamera.far = 200;
  }
  
  setTarget(target: THREE.Vector3) {
    this._target.position.copy(target);
  }
  
  getTarget(): THREE.Vector3 {
    return this._target.position.clone();
  }
  
  setColor(color: THREE.ColorRepresentation) {
    this.directionalLight.color.set(color);
  }
  
  setIntensity(intensity: number) {
    this.directionalLight.intensity = intensity;
  }
  
  setShadowCameraSize(size: number) {
    if (this.directionalLight.shadow) {
      const camera = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
      camera.left = -size;
      camera.right = size;
      camera.top = size;
      camera.bottom = -size;
      camera.updateProjectionMatrix();
    }
  }
}

export class PointLight extends Light {
  public readonly pointLight: THREE.PointLight;
  
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "point" });
    this.pointLight = this.light as THREE.PointLight;
  }
  
  protected createLight(config: LightConfig): THREE.Light {
    return new THREE.PointLight(
      config.color ?? 0xffffff,
      config.intensity ?? 1,
      config.distance ?? 0,
      config.decay ?? 2
    );
  }
  
  protected configureShadows(config: LightConfig) {
    super.configureShadows(config);
    if (!this.pointLight.shadow) {
      return;
    }
    
    // Configure shadow camera for point light
    const shadowCamera = this.pointLight.shadow.camera as THREE.PerspectiveCamera;
    shadowCamera.near = 0.1;
    shadowCamera.far = this.pointLight.distance || 100;
  }
  
  setColor(color: THREE.ColorRepresentation) {
    this.pointLight.color.set(color);
  }
  
  setIntensity(intensity: number) {
    this.pointLight.intensity = intensity;
  }
  
  setDistance(distance: number) {
    this.pointLight.distance = distance;
    // Update shadow camera far plane if shadows are enabled
    if (this.pointLight.shadow) {
      const camera = this.pointLight.shadow.camera as THREE.PerspectiveCamera;
      camera.far = distance || 100;
      camera.updateProjectionMatrix();
    }
  }
  
  setDecay(decay: number) {
    this.pointLight.decay = decay;
  }
  
  getDistance(): number {
    return this.pointLight.distance;
  }
  
  getDecay(): number {
    return this.pointLight.decay;
  }
}

export class SpotLight extends Light {
  public readonly spotLight: THREE.SpotLight;
  private _target: THREE.Object3D;
  
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "spot" });
    this.spotLight = this.light as THREE.SpotLight;
    this._target = new THREE.Object3D();
    this.add(this._target);
    this.spotLight.target = this._target;
    
    if (config.target) {
      this.setTarget(config.target);
    }
  }
  
  protected createLight(config: LightConfig): THREE.Light {
    return new THREE.SpotLight(
      config.color ?? 0xffffff,
      config.intensity ?? 1,
      config.distance ?? 0,
      config.angle ?? Math.PI / 3,
      config.penumbra ?? 0,
      config.decay ?? 2
    );
  }
  
  protected configureShadows(config: LightConfig) {
    super.configureShadows(config);
    if (!this.spotLight.shadow) {
      return;
    }
    
    // Configure shadow camera for spot light
    const shadowCamera = this.spotLight.shadow.camera as THREE.PerspectiveCamera;
    shadowCamera.near = 0.1;
    shadowCamera.far = this.spotLight.distance || 100;
    shadowCamera.fov = THREE.MathUtils.radToDeg(this.spotLight.angle) * 2;
    shadowCamera.updateProjectionMatrix();
  }
  
  setTarget(target: THREE.Vector3) {
    this._target.position.copy(target);
  }
  
  getTarget(): THREE.Vector3 {
    return this._target.position.clone();
  }
  
  setColor(color: THREE.ColorRepresentation) {
    this.spotLight.color.set(color);
  }
  
  setIntensity(intensity: number) {
    this.spotLight.intensity = intensity;
  }
  
  setDistance(distance: number) {
    this.spotLight.distance = distance;
    // Update shadow camera far plane if shadows are enabled
    if (this.spotLight.shadow) {
      const camera = this.spotLight.shadow.camera as THREE.PerspectiveCamera;
      camera.far = distance || 100;
      camera.updateProjectionMatrix();
    }
  }
  
  setAngle(angle: number) {
    this.spotLight.angle = angle;
    // Update shadow camera FOV if shadows are enabled
    if (this.spotLight.shadow) {
      const camera = this.spotLight.shadow.camera as THREE.PerspectiveCamera;
      camera.fov = THREE.MathUtils.radToDeg(angle) * 2;
      camera.updateProjectionMatrix();
    }
  }
  
  setPenumbra(penumbra: number) {
    this.spotLight.penumbra = penumbra;
  }
  
  setDecay(decay: number) {
    this.spotLight.decay = decay;
  }
  
  getDistance(): number {
    return this.spotLight.distance;
  }
  
  getAngle(): number {
    return this.spotLight.angle;
  }
  
  getPenumbra(): number {
    return this.spotLight.penumbra;
  }
  
  getDecay(): number {
    return this.spotLight.decay;
  }
}