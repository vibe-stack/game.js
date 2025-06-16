import * as THREE from "three/webgpu";
import { Registry, RegistryManager } from "./registry";
import { StateManager } from "./state-manager";
import { PhysicsManager } from "./physics-manager";
import { InteractionManager } from "./interaction-manager";
import { CameraManager } from "./camera-manager";
import { CameraControlManager } from "./camera-control-manager";
import { Entity } from "./entity";
import { Sphere } from "./primitives/sphere";
import { Box } from "./primitives/box";
import { GameConfig } from "./types";

export class GameWorld {
  public readonly scene: THREE.Scene;
  public readonly renderer: THREE.WebGPURenderer;
  public readonly clock: THREE.Clock;
  
  private registryManager: RegistryManager;
  private stateManager: StateManager;
  private physicsManager: PhysicsManager;
  private interactionManager: InteractionManager;
  private cameraManager: CameraManager;
  private cameraControlManager: CameraControlManager;
  
  private entities: Registry<Entity>;
  private cameras: Registry<THREE.Camera>;
  private controls: Registry<any>;
  
  private isRunning = false;
  private animationId: number | null = null;
  
  // State update throttling
  private lastStateUpdate = 0;
  private stateUpdateInterval = 1000 / 30; // 30 FPS for state updates

  constructor(config: GameConfig) {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    
    this.renderer = new THREE.WebGPURenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
    });
    
    const canvasRect = config.canvas.getBoundingClientRect();
    const width = canvasRect.width || config.canvas.clientWidth || 800;
    const height = canvasRect.height || config.canvas.clientHeight || 600;
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(config.pixelRatio ?? window.devicePixelRatio);
    
    if (config.shadowMapEnabled) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.registryManager = new RegistryManager();
    this.stateManager = new StateManager();
    this.physicsManager = new PhysicsManager();
    
    this.entities = this.registryManager.createRegistry<Entity>("entities");
    this.cameras = this.registryManager.createRegistry<THREE.Camera>("cameras");
    this.controls = this.registryManager.createRegistry<any>("controls");

    // Initialize new managers
    this.cameraManager = new CameraManager(
      this.cameras,
      this.stateManager,
      this.scene,
      width / height
    );
    
    this.cameraControlManager = new CameraControlManager(
      this.controls,
      this.stateManager
    );

    // Setup default camera first
    this.setupDefaultCamera(width, height);
    
    // Now initialize interaction manager with the active camera
    this.interactionManager = new InteractionManager(
      this.renderer as any,
      this.cameraManager.getActiveCamera()!,
      config.canvas
    );

    this.setupDefaultLighting();
    
    if (config.enablePhysics !== false) {
      this.initializePhysics(config.gravity);
    }

    this.updateState();
  }

  async initialize(): Promise<void> {
    await this.renderer.init();
  }

  private setupDefaultCamera(width: number, height: number): void {
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    this.cameras.add("default", "Default Camera", camera);
    this.cameraManager.setActiveCamera("default");
  }

  private setupDefaultLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
  }

  private async initializePhysics(gravity?: THREE.Vector3): Promise<void> {
    await this.physicsManager.initialize(gravity);
    this.updateState();
  }

  createSphere(config?: any): Sphere {
    const sphere = new Sphere(config);
    sphere.setPhysicsManager(this.physicsManager);
    this.addEntity(sphere);
    return sphere;
  }

  createBox(config?: any): Box {
    const box = new Box(config);
    box.setPhysicsManager(this.physicsManager);
    this.addEntity(box);
    return box;
  }

  createEntity(entity: Entity): Entity {
    entity.setPhysicsManager(this.physicsManager);
    this.addEntity(entity);
    return entity;
  }

  private addEntity(entity: Entity): void {
    const metadata = {
      type: entity.metadata.type,
      tags: entity.metadata.tags,
      created: entity.metadata.created,
    };
    
    this.entities.add(entity.entityId, entity.entityName, entity, metadata);
    this.scene.add(entity);
    this.interactionManager.add(entity);

    this.updateState();
  }

  removeEntity(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    this.scene.remove(entity);
    this.interactionManager.remove(entity);
    entity.destroy();
    
    const removed = this.entities.remove(id);
    if (removed) {
      this.updateState();
    }
    
    return removed;
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getEntityByName(name: string): Entity | undefined {
    return this.entities.getByName(name);
  }

  getEntitiesByTag(tag: string): Entity[] {
    return this.entities.getByTag(tag);
  }

  findEntities(predicate: (entity: Entity) => boolean): Entity[] {
    return this.entities.findByPredicate(predicate);
  }

  addCamera(id: string, name: string, camera: THREE.Camera): void {
    this.cameras.add(id, name, camera);
    this.updateState();
  }

  setActiveCamera(id: string): boolean {
    const camera = this.cameras.get(id);
    if (!camera) return false;

    const success = this.cameraManager.setActiveCamera(id);
    if (success) {
      // Update interaction manager with the new active camera
      this.interactionManager.camera = this.cameraManager.getActiveCamera()!;
      this.updateState();
    }
    return success;
  }

  getActiveCamera(): THREE.Camera | null {
    return this.cameraManager.getActiveCamera();
  }

  getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  getCameraControlManager(): CameraControlManager {
    return this.cameraControlManager;
  }

  addControls(id: string, name: string, controls: any): void {
    this.cameraControlManager.addControls(id, name, controls);
    this.updateState();
  }

  getControls(id: string): any {
    return this.cameraControlManager.getControls(id);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);
    
    const delta = this.clock.getDelta();
    const currentTime = performance.now();
    
    if (this.physicsManager.isEnabled()) {
      this.physicsManager.step();
    }

    this.entities.forEach((entity) => {
      if (!entity.isDestroyed()) {
        entity.syncPhysics();
        entity.updateTweens(delta);
      }
    });

    // Update camera manager (for transitions)
    this.cameraManager.update();

    // Update camera controls through the control manager
    this.cameraControlManager.update();

    // Throttle state updates to avoid performance issues
    if (currentTime - this.lastStateUpdate >= this.stateUpdateInterval) {
      this.updateState();
      this.lastStateUpdate = currentTime;
    }

    if (this.cameraManager.getActiveCamera()) {
      this.renderer.render(this.scene, this.cameraManager.getActiveCamera()!);
    }
  };

  private updateState(): void {
    const physicsWorld = this.physicsManager.getWorld();
    this.stateManager.mergeState({
      entities: new Map(
        this.entities.getAllRegistryItems().map(item => [
          item.id, 
          {
            id: item.item.entityId,
            name: item.item.entityName,
            position: {
              x: item.item.position.x,
              y: item.item.position.y,
              z: item.item.position.z
            },
            rotation: {
              x: item.item.rotation.x,
              y: item.item.rotation.y,
              z: item.item.rotation.z
            },
            scale: {
              x: item.item.scale.x,
              y: item.item.scale.y,
              z: item.item.scale.z
            },
            metadata: item.item.metadata,
            hasTag: (tag: string) => item.item.hasTag(tag),
            // Add other properties as needed
          }
        ])
      ),
      cameras: new Map(
        this.cameras.getAllRegistryItems().map(item => [item.id, item.item])
      ),
      controls: new Map(
        this.controls.getAllRegistryItems().map(item => [item.id, item.item])
      ),
      physics: {
        enabled: this.physicsManager.isEnabled(),
        ...(physicsWorld && { world: physicsWorld }),
      },
      scene: {
        activeCamera: this.cameraManager.getActiveCameraId(),
        activeControls: "",
      },
    });
  }

  getStateManager(): StateManager {
    return this.stateManager;
  }

  getPhysicsManager(): PhysicsManager {
    return this.physicsManager;
  }

  getRegistryManager(): RegistryManager {
    return this.registryManager;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.cameraManager.resize(width, height);
  }

  dispose(): void {
    this.stop();
    
    if (this.interactionManager) {
      this.interactionManager.dispose();
    }
    
    if (this.cameraControlManager) {
      this.cameraControlManager.dispose();
    }
    
    if (this.cameraManager) {
      this.cameraManager.dispose();
    }
    
    if (this.physicsManager) {
      this.physicsManager.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.registryManager) {
      this.registryManager.clearAll();
    }
    
    if (this.stateManager) {
      this.stateManager.clearSubscribers();
    }
  }
}
