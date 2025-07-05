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
    
    if ('castShadow' in this.light) {
      (this.light as any).castShadow = this.castShadow;
    }
    
    console.log("creating light, but", this.castShadow)
    if (this.castShadow) {
      this.configureShadows(config);
    }
  }

  // Abstract methods that subclasses must implement
  abstract setColor(color: THREE.ColorRepresentation): this;
  abstract setIntensity(intensity: number): this;

  protected abstract createLight(config: LightConfig): THREE.Light;
  
  protected configureShadows(config: LightConfig) {
    const shadowLight = this.light;
    // Shadow object is created lazily when castShadow is set to true
    // We need to ensure it exists before configuring
    if (!shadowLight?.shadow) {
      console.log("Shadow light not found");
      return;
    }

    console.log("shadowLight.shadow", shadowLight.shadow);
    
    // WebGPU shadow bias configuration to prevent shadow acne
    shadowLight.shadow.bias = config.shadowBias ?? -0.0001;
    shadowLight.shadow.normalBias = config.shadowNormalBias ?? 0.2;
    shadowLight.shadow.radius = config.shadowRadius ?? 4;
    shadowLight.shadow.needsUpdate = true;
    
    // Set shadow map size for better quality
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;
  }
  
  protected createCollider() {} // Lights don't have physics colliders
  
  serialize(): EntityData {
    const baseData = this.serializeBase();
    return {
      ...baseData,
      type: "light",
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
  
  setColor(color: THREE.ColorRepresentation): this {
    this.light.color.set(color);
    this.emitChange();
    return this;
  }
  
  setIntensity(intensity: number): this {
    this.light.intensity = intensity;
    this.emitChange();
    return this;
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
    
    // Handle target from config (during deserialization)
    if (config.target) {
      if (config.target instanceof THREE.Vector3) {
        this.setTarget(config.target);
      } else if (typeof config.target === 'object' && config.target !== null && 'x' in config.target && 'y' in config.target && 'z' in config.target) {
        // Handle serialized target object
        const targetObj = config.target as { x: number; y: number; z: number };
        this.setTarget(new THREE.Vector3(targetObj.x, targetObj.y, targetObj.z));
      }
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

    this.directionalLight.shadow.needsUpdate = true;
  }
  
  setTarget(target: THREE.Vector3) {
    this._target.position.copy(target);
  }
  
  getTarget(): THREE.Vector3 {
    return this._target.position.clone();
  }
  
  setColor(color: THREE.ColorRepresentation): this {
    this.directionalLight.color.set(color);
    this.emitChange();
    return this;
  }
  
  setIntensity(intensity: number): this {
    this.directionalLight.intensity = intensity;
    this.emitChange();
    return this;
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

  serialize(): EntityData {
    const baseData = super.serialize();
    return {
      ...baseData,
      properties: {
        ...baseData.properties,
        target: {
          x: this._target.position.x,
          y: this._target.position.y,
          z: this._target.position.z
        }
      }
    };
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

    this.pointLight.shadow.needsUpdate = true;
  }
  
  setColor(color: THREE.ColorRepresentation): this {
    this.pointLight.color.set(color);
    this.emitChange();
    return this;
  }
  
  setIntensity(intensity: number): this {
    this.pointLight.intensity = intensity;
    this.emitChange();
    return this;
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

  serialize(): EntityData {
    const baseData = super.serialize();
    return {
      ...baseData,
      properties: {
        ...baseData.properties,
        distance: this.pointLight.distance,
        decay: this.pointLight.decay
      }
    };
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
    
    // Handle target from config (during deserialization)
    if (config.target) {
      if (config.target instanceof THREE.Vector3) {
        this.setTarget(config.target);
      } else if (typeof config.target === 'object' && config.target !== null && 'x' in config.target && 'y' in config.target && 'z' in config.target) {
        // Handle serialized target object
        const targetObj = config.target as { x: number; y: number; z: number };
        this.setTarget(new THREE.Vector3(targetObj.x, targetObj.y, targetObj.z));
      }
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
    if (!this.spotLight?.shadow) {
      return;
    }
    
    // Configure shadow camera for spot light
    const shadowCamera = this.spotLight.shadow.camera as THREE.PerspectiveCamera;
    shadowCamera.near = 0.1;
    shadowCamera.far = this.spotLight.distance || 100;
    shadowCamera.fov = THREE.MathUtils.radToDeg(this.spotLight.angle) * 2;
    shadowCamera.updateProjectionMatrix();

    this.spotLight.shadow.needsUpdate = true;
  }
  
  setTarget(target: THREE.Vector3) {
    this._target.position.copy(target);
  }
  
  getTarget(): THREE.Vector3 {
    return this._target.position.clone();
  }
  
  setColor(color: THREE.ColorRepresentation): this {
    this.spotLight.color.set(color);
    this.emitChange();
    return this;
  }
  
  setIntensity(intensity: number): this {
    this.spotLight.intensity = intensity;
    this.emitChange();
    return this;
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

  serialize(): EntityData {
    const baseData = super.serialize();
    return {
      ...baseData,
      properties: {
        ...baseData.properties,
        distance: this.spotLight.distance,
        angle: this.spotLight.angle,
        penumbra: this.spotLight.penumbra,
        decay: this.spotLight.decay,
        target: {
          x: this._target.position.x,
          y: this._target.position.y,
          z: this._target.position.z
        }
      }
    };
  }
}