import { LoaderContext, EntityData } from "./types";
import { Entity } from "../entity";
import { 
  Sphere, Box, Cylinder, Cone, Torus, Capsule, Ring, Mesh3D, Plane,
  Heightfield, CustomHeightfield, Light, AmbientLight, DirectionalLight,
  PointLight, SpotLight
} from "../index";
import * as THREE from "three/webgpu";

export class EntityLoader {
  async load(context: LoaderContext, entityData: EntityData[]): Promise<void> {
    console.log(`Loading ${entityData.length} entities`);
    
    for (const data of entityData) {
      try {
        console.log(`Creating entity: ${data.name} (${data.type})`);
        const entity = await this.createEntity(context, data);
        if (entity) {
          console.log(`Successfully created entity: ${entity.entityName}`);
          
          // CRITICAL: Add entity to game world FIRST
          context.gameWorld.createEntity(entity);
          
          // THEN apply physics after entity is added to world
          await this.applyPhysicsToEntity(entity, data);
          
          console.log(`Entity fully initialized: ${entity.entityName}`);
        } else {
          console.warn(`Failed to create entity: ${data.name}`);
        }
      } catch (error) {
        console.error(`Error loading entity ${data.name}:`, error);
      }
    }
    
    console.log("Entity loading complete");
  }

  private async createEntity(context: LoaderContext, data: EntityData): Promise<Entity | null> {
    try {
      let entity: Entity;

      // Extract position, rotation, scale from transform object or use direct arrays
      const entityData = data as any;
      const position = entityData.transform ? 
        [entityData.transform.position.x, entityData.transform.position.y, entityData.transform.position.z] :
        entityData.position || [0, 0, 0];
      
      const rotation = entityData.transform ? 
        [entityData.transform.rotation.x, entityData.transform.rotation.y, entityData.transform.rotation.z] :
        entityData.rotation || [0, 0, 0];
      
      const scale = entityData.transform ? 
        [entityData.transform.scale.x, entityData.transform.scale.y, entityData.transform.scale.z] :
        entityData.scale || [1, 1, 1];

      // Get material from context or create inline
      const material = this.getMaterialForEntity(context, data);

      // Create entity based on type - following kitchen sink pattern
      switch (data.type) {
        case "sphere":
          entity = this.createSphere(data, material);
          break;
        case "box":
          entity = this.createBox(data, material);
          break;
        case "cylinder":
          entity = this.createCylinder(data, material);
          break;
        case "cone":
          entity = this.createCone(data, material);
          break;
        case "torus":
          entity = this.createTorus(data, material);
          break;
        case "capsule":
          entity = this.createCapsule(data, material);
          break;
        case "ring":
          entity = this.createRing(data, material);
          break;
        case "plane":
          entity = this.createPlane(data, material);
          break;
        case "heightfield":
          entity = this.createHeightfield(data, material);
          break;
        case "mesh3d":
          entity = this.createMesh3D(data, material);
          break;
        case "camera":
          // Skip cameras as they should be handled by CameraLoader
          return null;
        case "light":
          console.log(`Creating light entity: ${data.name}`, data);
          entity = this.createLight(data);
          console.log(`Light entity created successfully:`, entity);
          break;
        default:
          // Generic entity - follow kitchen sink pattern
          entity = new Entity({
            name: data.name,
            position: new THREE.Vector3(position[0], position[1], position[2]),
            rotation: new THREE.Euler(rotation[0], rotation[1], rotation[2]),
            scale: new THREE.Vector3(scale[0], scale[1], scale[2]),
          });
      }

      // Apply transform - following kitchen sink setPosition pattern
      entity.setPosition(position[0], position[1], position[2]);
      entity.setRotation(rotation[0], rotation[1], rotation[2]);
      entity.setScale(scale[0], scale[1], scale[2]);

      // Apply rendering properties
      entity.visible = data.visible !== false;
      entity.castShadow = data.castShadow !== false;
      entity.receiveShadow = data.receiveShadow !== false;
      entity.userData = { ...data.userData };

      // Apply tags - following kitchen sink addTag pattern
      if (data.tags) {
        data.tags.forEach(tag => entity.addTag(tag));
      }
      
      if (data.layer !== undefined) {
        entity.setLayer(data.layer);
      }

      return entity;
    } catch (error) {
      console.error(`Failed to create entity ${data.name}:`, error);
      return null;
    }
  }

  private async applyPhysicsToEntity(entity: Entity, data: EntityData): Promise<void> {
    // Apply physics AFTER entity is added to world - following kitchen sink pattern
    if (data.physics && data.physics.enabled) {
      console.log(`Adding physics to entity: ${entity.entityName}`, data.physics);
      
      try {
        switch (data.physics.type) {
          case "dynamic":
            entity.enableDynamicPhysics(
              data.physics.mass || 1,
              data.physics.restitution || 0.5,
              data.physics.friction || 0.7
            );
            break;
          case "static":
            entity.enableStaticPhysics(
              data.physics.restitution || 0.5,
              data.physics.friction || 0.7
            );
            break;
          case "kinematic":
            entity.enableKinematicPhysics();
            break;
          default:
            entity.enableDynamicPhysics(1, 0.5, 0.7);
        }
        console.log(`Physics added successfully to: ${entity.entityName}`);
      } catch (error) {
        console.error(`Failed to add physics to ${entity.entityName}:`, error);
      }
    }
  }

  private getMaterialForEntity(context: LoaderContext, data: EntityData): THREE.Material | undefined {
    // Try to get material from context first
    if (data.material) {
      // Check if it's a material reference with an ID
      const materialData = data.material as any;
      if (materialData.id && context.materials.has(materialData.id)) {
        return context.materials.get(materialData.id)!;
      }
      
      // Create material inline if not found in context
      const material = this.createMaterialFromData(context, data.material);
      return material || undefined;
    }
    
    return undefined;
  }

  private createSphere(data: EntityData, material?: THREE.Material): Sphere {
    const config = data.geometry?.parameters || {};
    return new Sphere({
      name: data.name,
      radius: config.radius || 1,
      widthSegments: config.widthSegments || 32,
      heightSegments: config.heightSegments || 16,
      material: material,
    });
  }

  private createBox(data: EntityData, material?: THREE.Material): Box {
    // Try properties first (canonical format), then fallback to geometry.parameters
    const props = (data as any).properties || {};
    const config = data.geometry?.parameters || {};
    return new Box({
      name: data.name,
      size: new THREE.Vector3(
        props.width || config.width || 1,
        props.height || config.height || 1,
        props.depth || config.depth || 1
      ),
      material: material,
    });
  }

  private createCylinder(data: EntityData, material?: THREE.Material): Cylinder {
    const config = data.geometry?.parameters || {};
    return new Cylinder({
      name: data.name,
      radiusTop: config.radiusTop || 1,
      radiusBottom: config.radiusBottom || 1,
      height: config.height || 1,
      radialSegments: config.radialSegments || 32,
      heightSegments: config.heightSegments || 1,
      material: material,
    });
  }

  private createCone(data: EntityData, material?: THREE.Material): Cone {
    const config = data.geometry?.parameters || {};
    return new Cone({
      name: data.name,
      radius: config.radius || 1,
      height: config.height || 1,
      radialSegments: config.radialSegments || 32,
      heightSegments: config.heightSegments || 1,
      material: material,
    });
  }

  private createTorus(data: EntityData, material?: THREE.Material): Torus {
    const config = data.geometry?.parameters || {};
    return new Torus({
      name: data.name,
      radius: config.radius || 1,
      tube: config.tube || 0.4,
      radialSegments: config.radialSegments || 16,
      tubularSegments: config.tubularSegments || 100,
      material: material,
    });
  }

  private createCapsule(data: EntityData, material?: THREE.Material): Capsule {
    const config = data.geometry?.parameters || {};
    return new Capsule({
      name: data.name,
      radius: config.radius || 1,
      length: config.length || 1,
      capSegments: config.capSegments || 4,
      radialSegments: config.radialSegments || 8,
      material: material,
    });
  }

  private createRing(data: EntityData, material?: THREE.Material): Ring {
    const config = data.geometry?.parameters || {};
    return new Ring({
      name: data.name,
      innerRadius: config.innerRadius || 0.5,
      outerRadius: config.outerRadius || 1,
      thetaSegments: config.thetaSegments || 32,
      phiSegments: config.phiSegments || 1,
      material: material,
    });
  }

  private createPlane(data: EntityData, material?: THREE.Material): Plane {
    const config = data.geometry?.parameters || {};
    return new Plane({
      name: data.name,
      width: config.width || 1,
      height: config.height || 1,
      widthSegments: config.widthSegments || 1,
      heightSegments: config.heightSegments || 1,
      material: material,
    });
  }

  private createHeightfield(data: EntityData, material?: THREE.Material): Heightfield {
    const config = data.geometry?.parameters || {};
    return new Heightfield({
      name: data.name,
      width: config.width || 100,
      depth: config.depth || 100,
      rows: config.rows || 64,
      columns: config.columns || 64,
      minElevation: config.minElevation || 0,
      maxElevation: config.maxElevation || 10,
      algorithm: config.algorithm || "perlin",
      seed: config.seed || 0,
      frequency: config.frequency || 0.1,
      amplitude: config.amplitude || 1,
      octaves: config.octaves || 4,
      persistence: config.persistence || 0.5,
      lacunarity: config.lacunarity || 2.0,
      material: material,
    });
  }

  private createMesh3D(data: EntityData, material?: THREE.Material): Mesh3D {
    const config = data.geometry?.parameters || {};
    return new Mesh3D({
      name: data.name,
      geometry: config.geometryType || "box",
      material: material,
    });
  }

  private createLight(data: EntityData): Light {
    const props = (data as any).properties || {};
    const lightType = props.type;
    
    if (!lightType) {
      throw new Error(`Light entity "${data.name}" missing type property`);
    }

    // Parse color - handle both hex strings and numbers
    let color = props.color || '#ffffff';
    if (typeof color === 'string' && color.startsWith('#')) {
      color = parseInt(color.replace('#', ''), 16);
    }

    const lightConfig = {
      name: data.name,
      lightType: lightType as "ambient" | "directional" | "point" | "spot",
      color: color,
      intensity: props.intensity || 1.0,
      distance: props.distance,
      angle: props.angle,
      penumbra: props.penumbra,
      decay: props.decay,
      castShadow: props.castShadow || false,
      target: props.target ? new THREE.Vector3(props.target[0], props.target[1], props.target[2]) : undefined,
      shadowMapSize: props.shadowMapSize ? [props.shadowMapSize[0], props.shadowMapSize[1]] as [number, number] : undefined,
      shadowCamera: props.shadowCamera,
    };

    // Create specific light type
    switch (lightType) {
      case 'ambient':
        return new AmbientLight(lightConfig);
      case 'directional':
        return new DirectionalLight(lightConfig);
      case 'point':
        return new PointLight(lightConfig);
      case 'spot':
        return new SpotLight(lightConfig);
      default:
        throw new Error(`Unsupported light type: ${lightType}`);
    }
  }

  private createMaterialFromData(context: LoaderContext, materialData: any): THREE.Material | null {
    try {
      let material: THREE.Material;

      // Handle canonical format where type might be in properties or at root level
      const materialType = materialData.type === 'standard' ? 'MeshStandardMaterial' : 
                          materialData.properties?.type === 'standard' ? 'MeshStandardMaterial' :
                          materialData.type || materialData.properties?.type || 'MeshStandardMaterial';

      switch (materialType) {
        case "MeshStandardMaterial":
        case "standard":
          material = new THREE.MeshStandardMaterial();
          break;
        case "MeshBasicMaterial":
        case "basic":
          material = new THREE.MeshBasicMaterial();
          break;
        case "MeshPhysicalMaterial":
        case "physical":
          material = new THREE.MeshPhysicalMaterial();
          break;
        case "MeshLambertMaterial":
        case "lambert":
          material = new THREE.MeshLambertMaterial();
          break;
        case "MeshPhongMaterial":
        case "phong":
          material = new THREE.MeshPhongMaterial();
          break;
        default:
          material = new THREE.MeshStandardMaterial();
      }

      // Apply properties - handle both nested and direct properties
      const properties = materialData.properties || materialData;
      if (properties) {
        Object.keys(properties).forEach(key => {
          if (key !== 'type' && key in material) {
            let value = properties[key];
            
            // Handle color conversion from hex strings
            if (key === 'color' && typeof value === 'string' && value.startsWith('#')) {
              value = parseInt(value.replace('#', ''), 16);
            }
            
            (material as any)[key] = value;
          }
        });
      }

      return material;
    } catch (error) {
      console.warn("Failed to create material from data:", error);
      return null;
    }
  }

  private async loadChildren(
    context: LoaderContext,
    parent: Entity,
    childrenData: EntityData[],
    entityMap: Map<string, Entity>
  ): Promise<void> {
    for (const childData of childrenData) {
      const child = await this.createEntity(context, childData);
      if (child) {
        parent.add(child);
        entityMap.set(childData.id, child);

        // Apply physics to child after adding to parent
        await this.applyPhysicsToEntity(child, childData);

        // Recursively load grandchildren
        if (childData.children && childData.children.length > 0) {
          await this.loadChildren(context, child, childData.children, entityMap);
        }
      }
    }
  }
} 