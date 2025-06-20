import * as THREE from "three/webgpu";
import { Registry, RegistryManager } from "./registry";
import { StateManager } from "./state-manager";
import { PhysicsManager } from "./physics-manager";
import { InteractionManager } from "./interaction-manager";
import { CameraManager } from "./camera-manager";
import { CameraControlManager } from "./camera-control-manager";
import { DebugRenderer } from "./debug-renderer";
import { Entity } from "./entity";
import { Sphere } from "./primitives/sphere";
import { Box } from "./primitives/box";
import { AmbientLight, DirectionalLight, PointLight, SpotLight } from "./primitives/light";
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
  private debugRenderer: DebugRenderer;
  
  private entities: Registry<Entity>;
  private cameras: Registry<THREE.Camera>;
  private controls: Registry<any>;
  
  private isRunning = false;
  private animationId: number | null = null;
  private isPaused = false;
  private renderLoopId: number | null = null;
  private entityTransformSnapshot: Map<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }> | null = null;
  
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

    // Initialize debug renderer
    this.debugRenderer = new DebugRenderer(this.scene, this.physicsManager);

    // Lighting will be handled by scene loading, no default lights needed
    
    if (config.enablePhysics !== false) {
      this.initializePhysics(config.gravity);
    }

    this.updateState();
  }

  async initialize(): Promise<void> {
    await this.renderer.init();
    // Start the render loop immediately after initialization
    this.startRenderLoop();
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

  // Light factory methods
  createAmbientLight(config?: any): AmbientLight {
    const light = new AmbientLight(config);
    this.addEntity(light);
    return light;
  }

  createDirectionalLight(config?: any): DirectionalLight {
    const light = new DirectionalLight(config);
    this.addEntity(light);
    return light;
  }

  createPointLight(config?: any): PointLight {
    const light = new PointLight(config);
    this.addEntity(light);
    return light;
  }

  createSpotLight(config?: any): SpotLight {
    const light = new SpotLight(config);
    this.addEntity(light);
    return light;
  }

  private addEntity(entity: Entity): void {
    const metadata = {
      type: entity.metadata.type,
      tags: entity.metadata.tags,
      created: entity.metadata.created,
    };
    
    console.log(`Adding entity to game world: ${entity.entityName} (${entity.metadata.type})`);
    this.entities.add(entity.entityId, entity.entityName, entity, metadata);
    this.scene.add(entity);
    this.interactionManager.add(entity);

    // Special handling for light entities
    if (entity.metadata.type === "light") {
      console.log(`Light entity added to scene:`, entity);
      console.log(`Scene now has ${this.scene.children.length} children`);
      
      // List all lights in the scene
      const lights: THREE.Light[] = [];
      this.scene.traverse((child) => {
        if (child instanceof THREE.Light) {
          lights.push(child);
        }
      });
      console.log(`Total lights in scene: ${lights.length}`, lights.map(l => ({ type: l.type, name: l.name })));
    }

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

  // Start continuous render loop (separate from physics simulation)
  private startRenderLoop(): void {
    if (this.renderLoopId) return;
    this.renderLoop();
  }

  // Continuous render loop - always renders the scene
  private renderLoop = (): void => {
    this.renderLoopId = requestAnimationFrame(this.renderLoop);
    
    // Always update camera and camera controls for UI responsiveness
    this.debugRenderer.update();
    this.cameraManager.update();
    this.cameraControlManager.update();

    // Always render the scene
    if (this.cameraManager.getActiveCamera()) {
      this.renderer.render(this.scene, this.cameraManager.getActiveCamera()!);
    }
  };

  // Stop the render loop
  private stopRenderLoop(): void {
    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
  }

  start(): void {
    if (this.isRunning) return;
    
    // Take snapshots before starting
    this.takeSnapshots();
    
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.clock.stop();
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Restore both physics and entity transforms
    this.restoreSnapshots();
  }

  private takeSnapshots(): void {
    // Take entity transform snapshot
    this.entityTransformSnapshot = new Map();
    this.entities.forEach((entity) => {
      this.entityTransformSnapshot!.set(entity.entityId, {
        position: entity.position.clone(),
        rotation: entity.rotation.clone(),
        scale: entity.scale.clone()
      });
    });
    
    console.log(`Entity snapshots taken: ${this.entityTransformSnapshot.size} entities`);
  }

  private restoreSnapshots(): void {
    let entitiesRestored = false;
    
    // Restore entity transforms from snapshot
    if (this.entityTransformSnapshot) {
      this.entities.forEach((entity) => {
        const snapshot = this.entityTransformSnapshot!.get(entity.entityId);
        if (snapshot) {
          // Restore visual transform
          entity.position.copy(snapshot.position);
          entity.rotation.copy(snapshot.rotation);
          entity.scale.copy(snapshot.scale);
          
          // Reset physics body if entity has physics (but keep the same world)
          const rigidBodyId = entity.getRigidBodyId();
          if (rigidBodyId && this.physicsManager) {
            const rigidBody = this.physicsManager.getRigidBody(rigidBodyId);
            if (rigidBody) {
              // Reset position and rotation
              rigidBody.setTranslation(entity.position, true);
              rigidBody.setRotation(entity.quaternion, true);
              // Reset velocities to zero
              rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
              rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
              // Wake up the body to ensure it's active
              rigidBody.wakeUp();
            }
          }
          entitiesRestored = true;
        }
      });
    }
    
    // Clear snapshots after use
    this.entityTransformSnapshot = null;
    
    console.log(`Entities restored: ${entitiesRestored}`);
  }

  pause(): void {
    this.isPaused = true;
    this.clock.stop();
  }

  resume(): void {
    this.isPaused = false;
    this.clock.start();
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  isRunningState(): boolean {
    return this.isRunning;
  }

  // Physics and entity animation loop - only runs when game is playing
  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);
    
    const delta = this.clock.getDelta();
    const currentTime = performance.now();
    
    // Only step physics if not paused
    if (!this.isPaused && this.physicsManager.isEnabled()) {
      this.physicsManager.step();
    }

    // Only update entities if not paused
    if (!this.isPaused) {
      this.entities.forEach((entity) => {
        if (!entity.isDestroyed()) {
          entity.syncPhysics();
          entity.updateTweens(delta);
        }
      });
    }

    // Throttle state updates to avoid performance issues
    if (currentTime - this.lastStateUpdate >= this.stateUpdateInterval) {
      this.updateState();
      this.lastStateUpdate = currentTime;
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
    this.stopRenderLoop();
    
    if (this.debugRenderer) {
      this.debugRenderer.dispose();
    }
    
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

  enablePhysicsDebugRender(): void {
    this.debugRenderer.enable();
  }

  disablePhysicsDebugRender(): void {
    this.debugRenderer.disable();
  }

  togglePhysicsDebugRender(): void {
    this.debugRenderer.toggle();
  }

  isPhysicsDebugRenderEnabled(): boolean {
    return this.debugRenderer.isEnabled();
  }

  getDebugRenderer(): DebugRenderer {
    return this.debugRenderer;
  }
}
