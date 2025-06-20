import { LoaderContext, LightingData } from "./types";
import * as THREE from "three/webgpu";

export class LightingLoader {
  async load(context: LoaderContext, lightingData: LightingData): Promise<void> {
    // Clear existing lights (except for any existing ones we want to preserve)
    this.clearExistingLights(context);

    // Load ambient light
    this.loadAmbientLight(context, lightingData.ambient);

    // Load directional lights
    for (const lightData of lightingData.directional) {
      this.loadDirectionalLight(context, lightData);
    }

    // Load point lights
    for (const lightData of lightingData.point) {
      this.loadPointLight(context, lightData);
    }

    // Load spot lights
    for (const lightData of lightingData.spot) {
      this.loadSpotLight(context, lightData);
    }

    console.log("Lighting configuration loaded");
  }

  private clearExistingLights(context: LoaderContext): void {
    // Remove existing lights from the scene
    const lightsToRemove: THREE.Light[] = [];
    
    context.gameWorld.scene.traverse((child) => {
      if (child instanceof THREE.Light) {
        lightsToRemove.push(child);
      }
    });

    lightsToRemove.forEach(light => {
      context.gameWorld.scene.remove(light);
    });
  }

  private loadAmbientLight(context: LoaderContext, ambientData: any): void {
    const ambientLight = new THREE.AmbientLight(
      ambientData.color,
      ambientData.intensity
    );
    ambientLight.name = "Ambient Light";
    context.gameWorld.scene.add(ambientLight);
  }

  private loadDirectionalLight(context: LoaderContext, lightData: any): void {
    const directionalLight = new THREE.DirectionalLight(
      lightData.color,
      lightData.intensity
    );

    directionalLight.name = lightData.name;
    directionalLight.position.set(lightData.position[0], lightData.position[1], lightData.position[2]);

    if (lightData.target) {
      directionalLight.target.position.set(lightData.target[0], lightData.target[1], lightData.target[2]);
      context.gameWorld.scene.add(directionalLight.target);
    }

    // Setup shadow casting
    directionalLight.castShadow = lightData.castShadow;
    if (lightData.castShadow && lightData.shadow) {
      const shadow = lightData.shadow;
      directionalLight.shadow.mapSize.width = shadow.mapSize[0];
      directionalLight.shadow.mapSize.height = shadow.mapSize[1];
      
      if (shadow.camera) {
        directionalLight.shadow.camera.near = shadow.camera.near;
        directionalLight.shadow.camera.far = shadow.camera.far;
        directionalLight.shadow.camera.left = shadow.camera.left;
        directionalLight.shadow.camera.right = shadow.camera.right;
        directionalLight.shadow.camera.top = shadow.camera.top;
        directionalLight.shadow.camera.bottom = shadow.camera.bottom;
      }
    }

    context.gameWorld.scene.add(directionalLight);
  }

  private loadPointLight(context: LoaderContext, lightData: any): void {
    const pointLight = new THREE.PointLight(
      lightData.color,
      lightData.intensity,
      lightData.distance,
      lightData.decay
    );

    pointLight.name = lightData.name;
    pointLight.position.set(lightData.position[0], lightData.position[1], lightData.position[2]);

    // Setup shadow casting
    pointLight.castShadow = lightData.castShadow;
    if (lightData.castShadow && lightData.shadow) {
      const shadow = lightData.shadow;
      pointLight.shadow.mapSize.width = shadow.mapSize[0];
      pointLight.shadow.mapSize.height = shadow.mapSize[1];
      
      if (shadow.camera) {
        pointLight.shadow.camera.near = shadow.camera.near;
        pointLight.shadow.camera.far = shadow.camera.far;
      }
    }

    context.gameWorld.scene.add(pointLight);
  }

  private loadSpotLight(context: LoaderContext, lightData: any): void {
    const spotLight = new THREE.SpotLight(
      lightData.color,
      lightData.intensity,
      lightData.distance,
      lightData.angle,
      lightData.penumbra,
      lightData.decay
    );

    spotLight.name = lightData.name;
    spotLight.position.set(lightData.position[0], lightData.position[1], lightData.position[2]);
    spotLight.target.position.set(lightData.target[0], lightData.target[1], lightData.target[2]);

    // Setup shadow casting
    spotLight.castShadow = lightData.castShadow;
    if (lightData.castShadow && lightData.shadow) {
      const shadow = lightData.shadow;
      spotLight.shadow.mapSize.width = shadow.mapSize[0];
      spotLight.shadow.mapSize.height = shadow.mapSize[1];
      
      if (shadow.camera) {
        spotLight.shadow.camera.near = shadow.camera.near;
        spotLight.shadow.camera.far = shadow.camera.far;
        spotLight.shadow.camera.fov = shadow.camera.fov;
      }
    }

    context.gameWorld.scene.add(spotLight);
    context.gameWorld.scene.add(spotLight.target);
  }
} 