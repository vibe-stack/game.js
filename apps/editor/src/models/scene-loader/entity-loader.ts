import { LoaderContext, EntityData } from "./types";
import { Entity, Box, Sphere, Cylinder, Cone, Torus, Capsule, Ring, Plane, Heightfield, Mesh3D, AmbientLight, DirectionalLight, PointLight, SpotLight } from "../index";
import { CameraManager } from "../camera-manager";
import * as THREE from "three/webgpu";

export class EntityLoader {
  async load(context: LoaderContext, entityData: EntityData[]): Promise<void> {
    const entityMap = new Map<string, Entity>();
    for (const data of entityData) {
      const entity = await this.createEntity(context, data, entityMap);
      if (entity) {
        entityMap.set(data.id, entity);
      }
    }
  }

  private async createEntity(context: LoaderContext, data: EntityData, entityMap: Map<string, Entity>): Promise<Entity | null> {
    console.log("creating entity", context, data, entityMap)
    const { gameWorld } = context;
    let entity: Entity | null = null;
    
    const config: any = {
      name: data.name,
      position: new THREE.Vector3(data.transform.position.x, data.transform.position.y, data.transform.position.z),
      rotation: new THREE.Euler(data.transform.rotation.x, data.transform.rotation.y, data.transform.rotation.z),
      scale: new THREE.Vector3(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z),
      material: data.material ? this.createMaterialFromData(context, data.material) : undefined,
      castShadow: data.castShadow,
      receiveShadow: data.receiveShadow,
      ...data.properties,
      ...data.geometry?.parameters
    };
    
    switch (data.type) {
      case "box": entity = new Box(config); break;
      case "sphere": entity = new Sphere(config); break;
      case "cylinder": entity = new Cylinder(config); break;
      case "cone": entity = new Cone(config); break;
      case "torus": entity = new Torus(config); break;
      case "capsule": entity = new Capsule(config); break;
      case "ring": entity = new Ring(config); break;
      case "plane": entity = new Plane(config); break;
      case "heightfield": entity = new Heightfield(config); break;
      case "mesh3d": entity = new Mesh3D(config); break;
      case "light": entity = this.createLight(data); break;
      case "camera": this.createCamera(context, data); return null; // Cameras are not entities in the scene graph
      default: throw new Error(`Unsupported entity type: ${data.type}`);
    }

    if (entity) {
      gameWorld.createEntity(entity);
      if (data.physics?.enabled) {
        this.applyPhysicsToEntity(entity, data);
      }
      if (data.children && data.children.length > 0) {
        for (const childData of data.children) {
          const childEntity = await this.createEntity(context, childData, entityMap);
          if (childEntity) {
            entity.add(childEntity);
          }
        }
      }
    }
    return entity;
  }

  private createLight(data: EntityData): Entity {
    const props = data.properties || {};
    const config = { ...data, lightType: props.type, ...props } as any;

    switch (props.type) {
      case "ambient": return new AmbientLight(config);
      case "directional": return new DirectionalLight(config);
      case "point": return new PointLight(config);
      case "spot": return new SpotLight(config);
      default: throw new Error(`Unsupported light type: ${props.type}`);
    }
  }

  private createCamera(context: LoaderContext, data: EntityData): void {
    console.log("creating camera", context, data)
    const cameraManager = context.gameWorld.getCameraManager();
    const camera = data.properties?.type === 'orthographic'
      ? new THREE.OrthographicCamera(data.properties?.left, data.properties?.right, data.properties?.top, data.properties?.bottom, data.properties?.near, data.properties?.far)
      : new THREE.PerspectiveCamera(data.properties?.fov, data.properties?.aspect, data.properties?.near, data.properties?.far);

    camera.position.set(data.transform.position.x, data.transform.position.y, data.transform.position.z);
    camera.rotation.set(data.transform.rotation.x, data.transform.rotation.y, data.transform.rotation.z);
    // if(data.transform.target) camera.lookAt(new THREE.Vector3(...data.transform.target));

    cameraManager.addCamera(data.id, data.name, camera);
    cameraManager.setActiveCamera(data.id);
    // if (data.active) {
    //   cameraManager.setActiveCamera(data.id);
    // }
  }

  private applyPhysicsToEntity(entity: Entity, data: EntityData): void {
    if (!data.physics || !data.physics.enabled) return;
    switch (data.physics.type) {
      case "dynamic": entity.enableDynamicPhysics(data.physics.mass, data.physics.restitution, data.physics.friction); break;
      case "static": entity.enableStaticPhysics(data.physics.restitution, data.physics.friction); break;
      case "kinematic": entity.enableKinematicPhysics(); break;
    }
  }

  private createMaterialFromData(context: LoaderContext, materialData: any): THREE.Material {
    const MatClass = (THREE as any)[materialData.type] || THREE.MeshStandardMaterial;
    const material = new MatClass(materialData.properties);
    return material;
  }
}