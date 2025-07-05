import * as THREE from "three/webgpu";
import { Registry, RegistryManager } from "./registry";
import { StateManager } from "./state-manager";
import { PhysicsManager } from "./physics-manager";
import { InteractionManager } from "./interaction-manager";
import { CameraManager } from "./camera-manager";
import { CameraControlManager } from "./camera-control-manager";
import { DebugRenderer } from "./debug-renderer";
import { InputManager } from "./input-manager";
import { Entity } from "./entity";
import { GameConfig } from "./types";
import { ScriptManager } from "./script-manager";
import { CharacterController } from "./character-controller";
import { Sphere } from "./primitives/sphere";

// New TSL post-processing imports
import { pass, mrt, output, emissive } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

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
  private inputManager: InputManager;
  private scriptManager: ScriptManager;

  private entities: Registry<Entity>;
  private cameras: Registry<THREE.Camera>;
  private controls: Registry<any>;
  private characterControllers: Map<string, CharacterController> = new Map();

  private isRunning = false;
  private animationId: number | null = null;
  private isPaused = false;
  private renderLoopId: number | null = null;

  private sceneSnapshot: Map<string, any> | null = null;

  // Target resolution settings
  private targetResolution: {
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  } = {
    width: 1920,
    height: 1080,
    maintainAspectRatio: true,
  };

  private postProcessing?: any;
  private scenePass?: any;
  private bloomPass?: any;

  private bloomSettings = {
    strength: 0.7,
    radius: 0.5,
  };

  constructor(config: GameConfig) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#2a2a2a"); // Default dark gray background
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGPURenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Don't set initial size here - let React/CSS handle it first
    // We'll set the proper size during initialization
    this.renderer.setPixelRatio(config.pixelRatio ?? window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    if (config.shadowMapEnabled) {
      this.renderer.shadowMap.enabled = true;
      // Use PCFShadowMap for better WebGPU compatibility
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    this.registryManager = new RegistryManager();
    this.stateManager = new StateManager();
    this.physicsManager = new PhysicsManager();

    this.entities = this.registryManager.createRegistry<Entity>("entities");
    this.cameras = this.registryManager.createRegistry<THREE.Camera>("cameras");
    this.controls = this.registryManager.createRegistry<any>("controls");

    // Use default aspect ratio initially - will be updated during initialization
    this.cameraManager = new CameraManager(
      this.cameras,
      this.stateManager,
      this.scene,
      16 / 9,
    );
    
    // Set up callback to reinitialize post-processing when camera changes
    this.cameraManager.setActiveCameraChangeCallback((camera) => {
      if (camera && this.postProcessing) {
        // Reinitialize post-processing with the new camera
        this.reinitializePostProcessing();
      }
    });
    
    // Set up callback to initialize post-processing when first camera is added
    this.cameraManager.setFirstCameraAddedCallback(() => {
      this.ensurePostProcessingInitialized();
    });
    
    this.cameraControlManager = new CameraControlManager(
      this.controls,
      this.stateManager,
    );
    // this.setupDefaultCamera(1920, 1080); // Default size, will be updated

    this.interactionManager = new InteractionManager(
      this.renderer as any,
      this.cameraManager,
      config.canvas,
    );
    this.debugRenderer = new DebugRenderer(this.scene, this.physicsManager);
    this.inputManager = new InputManager(config.canvas);
    this.scriptManager = new ScriptManager(this);

    if (config.enablePhysics !== false) {
      this.initializePhysics(config.gravity);
    }

    // Post-processing will be initialized after renderer is ready
  }

  async initialize(): Promise<void> {
    await this.renderer.init();
    
    // Now that the renderer is initialized and canvas is mounted, set proper size
    const canvas = this.renderer.domElement as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.clientWidth || 800;
    const height = rect.height || canvas.clientHeight || 600;
    
    if (width > 0 && height > 0) {
      this.renderer.setSize(width, height, false);
      this.cameraManager.resize(width, height);
    }
    
    // Setup post-processing after renderer is initialized
    this.initializePostProcessing();
    
    this.startRenderLoop();
  }

  // private setupDefaultCamera(width: number, height: number): void {
  //   const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  //   camera.position.set(0, 5, 10);
  //   camera.lookAt(0, 0, 0);
  //   this.cameras.add("default-camera", "Default Camera", camera);
  //   this.cameraManager.setActiveCamera("default-camera");
  // }

  private async initializePhysics(gravity?: THREE.Vector3): Promise<void> {
    await this.physicsManager.initialize(gravity);
  }

  public createEntity(entity: Entity): Entity {
    entity.setPhysicsManager(this.physicsManager);
    entity.setScriptManager(this.scriptManager);
    const metadata = {
      type: entity.metadata.type,
      tags: entity.metadata.tags,
      created: entity.metadata.created,
    };
    this.entities.add(entity.entityId, entity.entityName, entity, metadata);
    this.scene.add(entity);
    this.interactionManager.add(entity);
    return entity;
  }

  private startRenderLoop(): void {
    if (this.renderLoopId) return;
    const render = () => {
      this.renderLoopId = requestAnimationFrame(render);
      this.debugRenderer.update();
      this.cameraManager.update();
      this.cameraControlManager.update();
      const activeCamera = this.cameraManager.getActiveCamera();
      if (activeCamera) {
        // Keep scene pass camera in sync
        if (this.scenePass && this.scenePass.camera !== activeCamera) {
          this.scenePass.camera = activeCamera;
        }

        if (this.postProcessing) {
          this.postProcessing.render();
        } else {
          this.renderer.render(this.scene, activeCamera);
        }
      }
    };
    render();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();

    // Take a snapshot of entity states for reset
    this.takeEntitySnapshot();

    this.animate();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isPaused = false;
    this.clock.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Force update debug renderer when stopping to show current state
    this.forceUpdateDebugRenderer();
  }

  reset(): void {
    this.stop();
    if (this.sceneSnapshot) {
      this.restoreEntitySnapshot();
    } else {
      console.warn("No snapshot available to reset entities.");
      // Even without a snapshot, force update debug renderer to clear any stale visuals
      this.forceUpdateDebugRenderer();
    }
  }

  private takeEntitySnapshot(): void {
    this.sceneSnapshot = new Map();
    this.entities.forEach((entity) => {
      this.sceneSnapshot!.set(entity.entityId, {
        position: entity.position.clone(),
        rotation: entity.rotation.clone(),
        scale: entity.scale.clone(),
        visible: entity.visible,
      });
    });
  }

  private restoreEntitySnapshot(): void {
    if (!this.sceneSnapshot) return;

    this.entities.forEach((entity) => {
      const snapshot = this.sceneSnapshot!.get(entity.entityId);
      if (snapshot) {
        // Restore transform
        entity.position.copy(snapshot.position);
        entity.rotation.copy(snapshot.rotation);
        entity.scale.copy(snapshot.scale);
        entity.visible = snapshot.visible;

        // Update physics body position if it exists
        if (this.physicsManager && entity.getRigidBodyId()) {
          const rigidBody = this.physicsManager.getRigidBody(
            entity.getRigidBodyId()!,
          );
          if (rigidBody) {
            rigidBody.setTranslation(entity.position, true);
            rigidBody.setRotation(entity.quaternion, true);
            // Reset velocities
            if (rigidBody.bodyType() === 0) {
              // Dynamic body
              rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
              rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
            }
          }
        }

        // Force update
        entity.updateMatrixWorld(true);
      }
    });

    // Force update debug renderer to sync with new physics positions
    this.forceUpdateDebugRenderer();
  }

  private forceUpdateDebugRenderer(): void {
    // Force the debug renderer to immediately update with current physics state
    if (this.debugRenderer.isEnabled()) {
      this.debugRenderer.update();
    }
  }

  pause(): void {
    if (this.isRunning) {
      this.isPaused = true;
      this.clock.stop();
      // Force update debug renderer when pausing to show current state
      this.forceUpdateDebugRenderer();
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.clock.start();
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(this.animate);

    if (this.isPaused) return;

    const delta = this.clock.getDelta();
    if (this.physicsManager.isEnabled()) {
      this.physicsManager.step();
    }

    this.entities.forEach((entity) => {
      if (!entity.isDestroyed()) {
        entity.syncPhysics();
        entity.updateTweens(delta);

        // Update animations for Mesh3D entities
        if (
          entity.metadata.type === "mesh3d" &&
          (entity as any).updateAnimations
        ) {
          (entity as any).updateAnimations(delta);
        }
      }
    });

    // Update character controllers
    this.characterControllers.forEach((controller) => {
      controller.update(delta);
    });

    // Update scripts
    this.scriptManager.update(delta);
  };

  // ... (getters and other methods)
  getScene(): THREE.Scene {
    return this.scene;
  }
  getRenderer(): THREE.WebGPURenderer {
    return this.renderer;
  }
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement as HTMLCanvasElement;
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
  getCameraManager(): CameraManager {
    return this.cameraManager;
  }
  getCameraControlManager(): CameraControlManager {
    return this.cameraControlManager;
  }
  getInputManager(): InputManager {
    return this.inputManager;
  }
  getScriptManager(): ScriptManager {
    return this.scriptManager;
  }
  getEntitiesByTag(tag: string): Entity[] {
    return this.entities.getByTag(tag);
  }
  isPhysicsDebugRenderEnabled(): boolean {
    return this.debugRenderer.isEnabled();
  }
  togglePhysicsDebugRender(): void {
    this.debugRenderer.toggle();
  }
  enablePhysicsDebugRender(): void {
    this.debugRenderer.enable();
  }
  disablePhysicsDebugRender(): void {
    this.debugRenderer.disable();
  }
  forceUpdatePhysicsDebugRender(): void {
    this.forceUpdateDebugRenderer();
  }
  isRunningState(): boolean {
    return this.isRunning;
  }
  isPausedState(): boolean {
    return this.isPaused;
  }

  // Character controller management
  addCharacterController(
    entityId: string,
    controller: CharacterController,
  ): void {
    this.characterControllers.set(entityId, controller);
  }

  removeCharacterController(entityId: string): void {
    const controller = this.characterControllers.get(entityId);
    if (controller) {
      controller.dispose();
      this.characterControllers.delete(entityId);
    }
  }

  getCharacterController(entityId: string): CharacterController | undefined {
    return this.characterControllers.get(entityId);
  }

  clearCharacterControllers(): void {
    this.characterControllers.forEach((controller) => controller.dispose());
    this.characterControllers.clear();
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    // Calculate pixel ratio based on target resolution
    const pixelRatio = this.calculatePixelRatio(width, height);

    // Update renderer size
    this.renderer.setSize(width, height, false); // false = don't update CSS styles
    this.renderer.setPixelRatio(pixelRatio);

    // Update camera aspect ratios
    this.cameraManager.resize(width, height);
  }

  private calculatePixelRatio(
    canvasWidth: number,
    canvasHeight: number,
  ): number {
    const {
      width: targetWidth,
      height: targetHeight,
      maintainAspectRatio,
    } = this.targetResolution;

    if (!maintainAspectRatio) {
      // Calculate pixel ratio to match target resolution as closely as possible
      const widthRatio = targetWidth / canvasWidth;
      const heightRatio = targetHeight / canvasHeight;
      return Math.min(widthRatio, heightRatio);
    }

    // Maintain aspect ratio - calculate based on the smaller dimension
    const targetAspectRatio = targetWidth / targetHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;

    if (canvasAspectRatio > targetAspectRatio) {
      // Canvas is wider than target, use height as reference
      return targetHeight / canvasHeight;
    } else {
      // Canvas is taller than target, use width as reference
      return targetWidth / canvasWidth;
    }
  }

  setTargetResolution(
    width: number,
    height: number,
    maintainAspectRatio: boolean = true,
  ): void {
    this.targetResolution = { width, height, maintainAspectRatio };

    // Apply the new target resolution immediately
    const canvas = this.renderer.domElement as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width || canvas.clientWidth;
    const canvasHeight = rect.height || canvas.clientHeight;

    if (canvasWidth > 0 && canvasHeight > 0) {
      this.resize(canvasWidth, canvasHeight);
    }
  }

  getTargetResolution(): {
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  } {
    return { ...this.targetResolution };
  }

  dispose(): void {
    this.stop();
    if (this.renderLoopId) cancelAnimationFrame(this.renderLoopId);
    this.entities.forEach((entity) => entity.destroy());
    this.registryManager.clearAll();
    this.clearCharacterControllers(); // Clean up character controllers
    this.debugRenderer.dispose();
    this.interactionManager.dispose();
    this.cameraControlManager.dispose();
    this.cameraManager.dispose();
    this.physicsManager.dispose();
    this.inputManager.dispose();
    this.scriptManager.dispose();
    if (
      this.postProcessing &&
      typeof this.postProcessing.dispose === "function"
    ) {
      this.postProcessing.dispose();
    }
    this.renderer.dispose();
    this.scene.clear();
  }

  /**
   * Initializes post-processing using Three TSL with bloom.
   */
  private initializePostProcessing(): void {
    const camera = this.cameraManager.getActiveCamera();
    if (!camera) {
      // If no camera is available yet, we'll initialize post-processing later
      return;
    }

    try {
      // Scene pass with MRT (output + emissive)
      this.scenePass = pass(this.scene, camera);
      this.scenePass.setMRT(
        mrt({
          output,
          emissive,
        }),
      );

      const outputPass = this.scenePass.getTextureNode();
      const emissivePass = this.scenePass.getTextureNode("emissive");

      // Bloom pass driven by emissive buffer
      this.bloomPass = bloom(
        emissivePass,
        this.bloomSettings.strength,
        this.bloomSettings.radius,
      );

      this.postProcessing = new THREE.PostProcessing(this.renderer);
      this.postProcessing.outputNode = outputPass.add(this.bloomPass);
    } catch (error) {
      console.error("Failed to initialize post-processing:", error);
      // Fallback to regular rendering
      this.postProcessing = null;
    }
  }

  /**
   * Reinitialize post-processing when camera changes
   */
  public reinitializePostProcessing(): void {
    if (this.postProcessing && typeof this.postProcessing.dispose === "function") {
      this.postProcessing.dispose();
    }
    this.postProcessing = null;
    this.scenePass = null;
    this.bloomPass = null;
    
    this.initializePostProcessing();
  }

  /**
   * Manually initialize post-processing - useful when cameras become available
   */
  public ensurePostProcessingInitialized(): void {
    if (!this.postProcessing) {
      this.initializePostProcessing();
    }
  }

  /**
   * Check if post-processing is available
   */
  public isPostProcessingAvailable(): boolean {
    return !!this.postProcessing && !!this.bloomPass;
  }

  /* ------------------------------------------------------------------ */
  /* Bloom & Tone Mapping                                               */
  /* ------------------------------------------------------------------ */

  setBloomSettings(strength: number, radius: number): void {
    this.bloomSettings.strength = strength;
    this.bloomSettings.radius = radius;
    
    if (this.bloomPass) {
      // Access bloom node properties correctly
      if (this.bloomPass.strength && typeof this.bloomPass.strength === 'object' && 'value' in this.bloomPass.strength) {
        this.bloomPass.strength.value = strength;
      }
      
      if (this.bloomPass.radius && typeof this.bloomPass.radius === 'object' && 'value' in this.bloomPass.radius) {
        this.bloomPass.radius.value = radius;
      }
    }
  }

  getBloomSettings(): { strength: number; radius: number } {
    return { ...this.bloomSettings };
  }

  /**
   * Set renderer tone mapping exposure.
   */
  setToneMappingExposure(exposure: number): void {
    // WebGPURenderer inherits from WebGLRenderer and supports this property
    // The cast avoids type mismatch in @types/three.
    this.renderer.toneMappingExposure = exposure;
  }

  getToneMappingExposure(): number {
    return this.renderer.toneMappingExposure ?? 1.0;
  }

  /**
   * Create a test glowing object to verify bloom is working
   */
  createTestGlowingObject(): void {
    
  }
}
