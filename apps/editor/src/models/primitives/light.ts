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
    }
  }

  protected abstract createLight(config: LightConfig): THREE.Light;
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
  constructor(config: Omit<LightConfig, "lightType"> = {}) { super({ ...config, lightType: "ambient" }); }
  protected createLight(config: LightConfig): THREE.Light { return new THREE.AmbientLight(config.color, config.intensity); }
}
export class DirectionalLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) { super({ ...config, lightType: "directional" }); }
  protected createLight(config: LightConfig): THREE.Light { return new THREE.DirectionalLight(config.color, config.intensity); }
}
export class PointLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) { super({ ...config, lightType: "point" }); }
  protected createLight(config: LightConfig): THREE.Light { return new THREE.PointLight(config.color, config.intensity, config.distance, config.decay); }
}
export class SpotLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) { super({ ...config, lightType: "spot" }); }
  protected createLight(config: LightConfig): THREE.Light { return new THREE.SpotLight(config.color, config.intensity, config.distance, config.angle, config.penumbra, config.decay); }
}