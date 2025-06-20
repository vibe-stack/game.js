import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";

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
  shadowMapSize?: [number, number];
  shadowCamera?: {
    near?: number;
    far?: number;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    fov?: number;
  };
}

export class Light extends Entity {
  public readonly light: THREE.Light;
  public readonly lightType: string;

  constructor(config: LightConfig) {
    super(config);
    
    this.lightType = config.lightType;
    this.metadata.type = "light";

    // Create the appropriate Three.js light based on type
    switch (config.lightType) {
      case "ambient":
        this.light = new THREE.AmbientLight(
          config.color || 0x404040,
          config.intensity || 0.4
        );
        break;
      
      case "directional":
        this.light = new THREE.DirectionalLight(
          config.color || 0xffffff,
          config.intensity || 1.0
        );
        this.setupDirectionalLight(config);
        break;
      
      case "point":
        this.light = new THREE.PointLight(
          config.color || 0xffffff,
          config.intensity || 1.0,
          config.distance || 0,
          config.decay || 2
        );
        this.setupPointLight(config);
        break;
      
      case "spot":
        this.light = new THREE.SpotLight(
          config.color || 0xffffff,
          config.intensity || 1.0,
          config.distance || 0,
          config.angle || Math.PI / 3,
          config.penumbra || 0,
          config.decay || 2
        );
        this.setupSpotLight(config);
        break;
      
      default:
        throw new Error(`Unsupported light type: ${config.lightType}`);
    }

    this.light.name = this.entityName;
    this.add(this.light);

    // Set up shadow casting if enabled
    if (config.castShadow && this.light.type !== "AmbientLight") {
      this.setupShadows(config);
    }
  }

  private setupDirectionalLight(config: LightConfig): void {
    const directionalLight = this.light as THREE.DirectionalLight;
    
    if (config.target) {
      directionalLight.target.position.copy(config.target);
    }
  }

  private setupPointLight(config: LightConfig): void {
    const pointLight = this.light as THREE.PointLight;
    
    if (config.distance !== undefined) {
      pointLight.distance = config.distance;
    }
    if (config.decay !== undefined) {
      pointLight.decay = config.decay;
    }
  }

  private setupSpotLight(config: LightConfig): void {
    const spotLight = this.light as THREE.SpotLight;
    
    if (config.distance !== undefined) {
      spotLight.distance = config.distance;
    }
    if (config.angle !== undefined) {
      spotLight.angle = config.angle;
    }
    if (config.penumbra !== undefined) {
      spotLight.penumbra = config.penumbra;
    }
    if (config.decay !== undefined) {
      spotLight.decay = config.decay;
    }
    if (config.target) {
      spotLight.target.position.copy(config.target);
    }
  }

  private setupShadows(config: LightConfig): void {
    if (this.light.type === "AmbientLight") return;

    const shadowLight = this.light as THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;
    shadowLight.castShadow = true;

    // Set shadow map size
    if (config.shadowMapSize) {
      shadowLight.shadow.mapSize.width = config.shadowMapSize[0];
      shadowLight.shadow.mapSize.height = config.shadowMapSize[1];
    } else {
      shadowLight.shadow.mapSize.width = 1024;
      shadowLight.shadow.mapSize.height = 1024;
    }

    // Configure shadow camera
    if (config.shadowCamera) {
      const shadowCamera = shadowLight.shadow.camera;
      
      if (config.shadowCamera.near !== undefined) {
        shadowCamera.near = config.shadowCamera.near;
      }
      if (config.shadowCamera.far !== undefined) {
        shadowCamera.far = config.shadowCamera.far;
      }

      // Configure orthographic camera properties for directional lights
      if (shadowLight.type === "DirectionalLight") {
        const orthoCamera = shadowCamera as THREE.OrthographicCamera;
        if (config.shadowCamera.left !== undefined) orthoCamera.left = config.shadowCamera.left;
        if (config.shadowCamera.right !== undefined) orthoCamera.right = config.shadowCamera.right;
        if (config.shadowCamera.top !== undefined) orthoCamera.top = config.shadowCamera.top;
        if (config.shadowCamera.bottom !== undefined) orthoCamera.bottom = config.shadowCamera.bottom;
      }

      // Configure perspective camera properties for spot lights
      if (shadowLight.type === "SpotLight" && config.shadowCamera.fov !== undefined) {
        const perspectiveCamera = shadowCamera as THREE.PerspectiveCamera;
        perspectiveCamera.fov = config.shadowCamera.fov;
      }
    }
  }

  // Override setPosition to also update light position
  setPosition(x: number, y: number, z: number): this {
    super.setPosition(x, y, z);
    
    // For directional lights, we need to update the light position
    if (this.light.type === "DirectionalLight") {
      this.light.position.set(x, y, z);
    }
    
    return this;
  }

  // Override setRotation to also update light rotation
  setRotation(x: number, y: number, z: number): this {
    super.setRotation(x, y, z);
    
    // For directional and spot lights, rotation affects the light direction
    if (this.light.type === "DirectionalLight" || this.light.type === "SpotLight") {
      this.light.rotation.set(x, y, z);
    }
    
    return this;
  }

  // Light-specific methods
  setColor(color: THREE.ColorRepresentation): this {
    this.light.color.set(color);
    return this;
  }

  setIntensity(intensity: number): this {
    this.light.intensity = intensity;
    return this;
  }

  setDistance(distance: number): this {
    if (this.light.type === "PointLight" || this.light.type === "SpotLight") {
      (this.light as THREE.PointLight | THREE.SpotLight).distance = distance;
    }
    return this;
  }

  setCastShadow(castShadow: boolean): this {
    if (this.light.type !== "AmbientLight") {
      (this.light as THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight).castShadow = castShadow;
    }
    return this;
  }

  getLight(): THREE.Light {
    return this.light;
  }

  getLightType(): string {
    return this.lightType;
  }
}

// Convenience factory functions for different light types
export class AmbientLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "ambient" });
  }
}

export class DirectionalLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "directional" });
  }
}

export class PointLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "point" });
  }
}

export class SpotLight extends Light {
  constructor(config: Omit<LightConfig, "lightType"> = {}) {
    super({ ...config, lightType: "spot" });
  }
} 