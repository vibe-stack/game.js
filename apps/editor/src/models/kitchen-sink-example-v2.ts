import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  GameWorld,
  InputManager,
  SoundManager,
  AssetManager,
  createStateHook,
  type GameState,
  type InputBinding,
  type CameraFollowConfig
} from "./index";

// Improved kitchen sink example with proper player movement and camera following
export async function createKitchenSinkExampleV2(canvas: HTMLCanvasElement) {
  const game = new GameWorld({
    canvas,
    enablePhysics: true,
    gravity: new THREE.Vector3(0, -9.81, 0),
    antialias: true,
    shadowMapEnabled: true,
  });

  // Initialize WebGPU renderer
  await game.initialize();

  // Get all managers
  const cameraManager = game.getCameraManager();
  const controlManager = game.getCameraControlManager();
  const stateManager = game.getStateManager();
  const physicsManager = game.getPhysicsManager();

  // Initialize additional systems
  const inputManager = new InputManager(canvas);
  const soundManager = new SoundManager();
  const assetManager = new AssetManager();

  // Initialize audio system (requires user interaction)
  try {
    await soundManager.initialize();
  } catch (error) {
    console.warn("Audio system initialization failed, continuing without audio:", error);
  }

  // Setup multiple cameras with different perspectives
  const setupCameras = () => {
    // Top-down view for strategy-like perspective
    const topCamera = cameraManager.createPerspectiveCamera(
      "top-view",
      "Top View Camera",
      {
        position: new THREE.Vector3(0, 25, 0),
        target: new THREE.Vector3(0, 0, 0),
        fov: 60
      }
    );

    // Side view for platformer-like perspective
    const sideCamera = cameraManager.createPerspectiveCamera(
      "side-view",
      "Side View Camera",
      {
        position: new THREE.Vector3(20, 8, 0),
        target: new THREE.Vector3(0, 0, 0),
        fov: 75
      }
    );

    // First person camera - will follow player
    const firstPersonCamera = cameraManager.createPerspectiveCamera(
      "first-person",
      "First Person Camera",
      {
        position: new THREE.Vector3(0, 2, 5),
        target: new THREE.Vector3(0, 2, 0),
        fov: 90
      }
    );

    // Cinematic camera with wide angle
    const cinematicCamera = cameraManager.createPerspectiveCamera(
      "cinematic",
      "Cinematic Camera",
      {
        position: new THREE.Vector3(-10, 15, 20),
        target: new THREE.Vector3(0, 0, 0),
        fov: 35
      }
    );

    return { topCamera, sideCamera, firstPersonCamera, cinematicCamera };
  };

  const cameras = setupCameras();

  // Setup orbit controls for all cameras except FPS
  const setupControls = () => {
    const controls = [
      { id: "default", camera: cameraManager.getCamera("default")! },
      { id: "top-view", camera: cameras.topCamera },
      { id: "side-view", camera: cameras.sideCamera },
      { id: "cinematic", camera: cameras.cinematicCamera }
    ];

    controls.forEach(({ id, camera }, index) => {
      const orbitControls = new OrbitControls(camera, canvas);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.enableZoom = true;
      orbitControls.enablePan = true;

      controlManager.addControls(
        `${id}-orbit`,
        `${id} Orbit Controls`,
        orbitControls,
        { enabled: index === 0 }
      );
      controlManager.associateWithCamera(`${id}-orbit`, id);
    });
  };

  setupControls();

  // Enhanced lighting setup
  const setupLighting = () => {
    // Remove default lighting first
    game.scene.clear();

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    game.scene.add(ambientLight);

    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    game.scene.add(sunLight);

    // Point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0xff4444, 0.5, 10);
    pointLight1.position.set(5, 3, 5);
    pointLight1.castShadow = true;
    game.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4444ff, 0.5, 10);
    pointLight2.position.set(-5, 3, -5);
    pointLight2.castShadow = true;
    game.scene.add(pointLight2);

    return { ambientLight, sunLight, pointLight1, pointLight2 };
  };

  const lights = setupLighting();

  // Create various materials
  const createMaterials = () => {
    const materials = {
      metal: new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 1.0,
        roughness: 0.2,
      }),
      plastic: new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.0,
        roughness: 0.8,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.9,
        thickness: 0.5,
      }),
      neon: new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x004400,
        emissiveIntensity: 0.5,
      }),
      wireframe: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
      }),
    };

    return materials;
  };

  const materials = createMaterials();

  // Create entities with proper physics setup
  const createEntities = () => {
    const entities = [];

    // Ground plane
    const ground = game
      .createBox({
        size: new THREE.Vector3(20, 1, 20),
        name: "Ground",
        material: materials.metal
      })
      .setPosition(0, -5, 0)
      .enableStaticPhysics(0.3, 0.9)
      .addTag("ground");
    entities.push(ground);

    // Player sphere - now kinematic for proper movement control
    const player = game
      .createSphere({
        radius: 1,
        name: "Player",
        material: materials.plastic
      })
      .setPosition(0, 1, 0)
      .enableKinematicPhysics() // Changed to kinematic!
      .addTag("player")
      .onClick((event) => {
        // Add a small impulse for fun, but movement is controlled via keyboard
        const randomJump = new THREE.Vector3(0, 10, 0);
        player.applyImpulse(randomJump);
        soundManager.play("bounce").catch(console.error);
      });
    entities.push(player);

    // Bouncing spheres for interaction
    for (let i = 0; i < 5; i++) {
      const materialKeys = Object.keys(materials);
      const randomMaterial = materials[materialKeys[Math.floor(Math.random() * materialKeys.length)] as keyof typeof materials];

      const sphere = game
        .createSphere({
          radius: 0.5 + Math.random() * 0.5,
          name: `Bouncing Sphere ${i}`,
          material: randomMaterial
        })
        .setPosition(
          (Math.random() - 0.5) * 10,
          Math.random() * 10 + 5,
          (Math.random() - 0.5) * 10
        )
        .enableDynamicPhysics(0.5 + Math.random() * 2, 0.9, 0.1)
        .addTag("bouncer")
        .onClick(() => {
          sphere.setPosition(
            (Math.random() - 0.5) * 15,
            Math.random() * 10 + 10,
            (Math.random() - 0.5) * 15
          );
          soundManager.play("teleport").catch(console.error);
        });
      entities.push(sphere);
    }

    // Static obstacles
    const obstacle1 = game
      .createBox({
        size: new THREE.Vector3(1, 3, 1),
        name: "Tower",
        material: materials.neon
      })
      .setPosition(-5, -2, 0)
      .enableStaticPhysics(0.5, 0.8)
      .addTag("obstacle");
    entities.push(obstacle1);

    return entities;
  };

  const entities = createEntities();
  const player = entities.find(e => e.hasTag("player"))!;

  // Setup first-party camera following for FPS camera
  const setupCameraFollowing = () => {
    // Set up first-person camera to follow player
    const followConfig: CameraFollowConfig = {
      target: () => player, // Function that returns the player entity
      offset: new THREE.Vector3(0, 3, 5), // Eye height offset
      followPosition: true,
      followRotation: false, // We'll handle rotation manually with mouse look
      smoothing: 0 // Instant following for responsive FPS feel
    };

    cameraManager.setCameraFollow("first-person", followConfig);
  };

  setupCameraFollowing();

  // Player movement system using kinematic physics
  const playerMovement = {
    velocity: new THREE.Vector3(),
    speed: 8.0,
    jumpForce: 12.0,
    onGround: false,
    groundHeight: 0.5,

    update(deltaTime: number) {
      // Apply gravity if not on ground
      if (!this.onGround) {
        this.velocity.y -= 20.0 * deltaTime; // Stronger gravity for more responsive feel
      }

      // Apply velocity to player position
      const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
      const newPosition = player.position.clone().add(deltaPosition);

      // Check ground collision first
      if (newPosition.y <= this.groundHeight) {
        newPosition.y = this.groundHeight;
        this.velocity.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }

      // Update player position
      player.setPosition(newPosition.x, newPosition.y, newPosition.z);

      // Apply damping to horizontal movement
      this.velocity.x *= 0.85;
      this.velocity.z *= 0.85;

      // Clamp horizontal velocities to prevent runaway speed
      const maxHorizontalSpeed = this.speed * 1.5;
      this.velocity.x = Math.max(-maxHorizontalSpeed, Math.min(maxHorizontalSpeed, this.velocity.x));
      this.velocity.z = Math.max(-maxHorizontalSpeed, Math.min(maxHorizontalSpeed, this.velocity.z));
    },

    move(direction: THREE.Vector3) {
      const acceleration = this.speed * 2.0; // Higher acceleration for responsiveness
      this.velocity.x += direction.x * acceleration;
      this.velocity.z += direction.z * acceleration;
    },

    jump() {
      if (this.onGround) {
        this.velocity.y = this.jumpForce;
        this.onGround = false;
      }
    }
  };

  // FPS Mouse Look System
  const fpsMouseLook = {
    isEnabled: false,
    rotation: { pitch: 0, yaw: 0 },
    sensitivity: 0.002,
    maxPitch: Math.PI / 2 - 0.1,

    enable() {

      if (cameraManager.getActiveCameraId() === 'first-person') {
        canvas.requestPointerLock();
      }
    },

    disable() {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    },

    handleMouseMove(event: MouseEvent) {
      if (!this.isEnabled || cameraManager.getActiveCameraId() !== 'first-person') return;

      this.rotation.yaw -= event.movementX * this.sensitivity;
      this.rotation.pitch -= event.movementY * this.sensitivity;
      this.rotation.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.rotation.pitch));

      // Apply rotation to camera
      const camera = cameraManager.getCamera("first-person");
      if (camera) {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = this.rotation.yaw;
        camera.rotation.x = this.rotation.pitch;
      }
    },

    reset() {
      this.rotation.pitch = 0;
      this.rotation.yaw = 0;
      const camera = cameraManager.getCamera("first-person");
      if (camera) {
        camera.rotation.set(0, 0, 0);
      }
    }
  };

  // Setup input handling
  const setupInput = () => {
    // Pointer lock events
    canvas.addEventListener('click', () => {
      if (cameraManager.getActiveCameraId() === 'first-person') {
        fpsMouseLook.enable();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      fpsMouseLook.isEnabled = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (event) => {
      fpsMouseLook.handleMouseMove(event);
    });

    // Escape to exit pointer lock
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && fpsMouseLook.isEnabled) {
        fpsMouseLook.disable();
      }
    });

    // Movement controls using direct keyboard state tracking
    const movementState = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // Track keyboard state directly for smoother movement
    const keyState = new Set<string>();

    document.addEventListener('keydown', (event) => {
      keyState.add(event.code);
    });

    document.addEventListener('keyup', (event) => {
      keyState.delete(event.code);
    });

    const bindings: InputBinding[] = [
      {
        id: "jump",
        name: "Jump",
        inputs: [{ type: "keyboard", key: "Space" }],
        callback: () => {
          playerMovement.jump();
          soundManager.play("jump").catch(console.error);
        }
      },
      // Camera controls
      {
        id: "camera-1",
        name: "Camera 1",
        inputs: [{ type: "keyboard", key: "Digit1" }],
        callback: () => switchToCamera("default")
      },
      {
        id: "camera-2",
        name: "Camera 2",
        inputs: [{ type: "keyboard", key: "Digit2" }],
        callback: () => switchToCamera("top-view")
      },
      {
        id: "camera-3",
        name: "Camera 3",
        inputs: [{ type: "keyboard", key: "Digit3" }],
        callback: () => switchToCamera("side-view")
      },
      {
        id: "camera-4",
        name: "Camera 4",
        inputs: [{ type: "keyboard", key: "Digit4" }],
        callback: () => switchToCamera("first-person")
      },
      {
        id: "camera-5",
        name: "Camera 5",
        inputs: [{ type: "keyboard", key: "Digit5" }],
        callback: () => switchToCamera("cinematic")
      }
    ];

    bindings.forEach(binding => inputManager.addBinding(binding));

    // Movement update function
    const updateMovement = (deltaTime: number) => {
      const moveDirection = new THREE.Vector3();

      // Update movement state from keyboard
      movementState.forward = keyState.has('KeyW');
      movementState.backward = keyState.has('KeyS');
      movementState.left = keyState.has('KeyA');
      movementState.right = keyState.has('KeyD');

      if (cameraManager.getActiveCameraId() === 'first-person') {
        // FPS-style movement relative to camera
        const camera = cameraManager.getCamera("first-person");
        if (camera) {
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          forward.y = 0; // Keep movement horizontal
          forward.normalize();

          const right = new THREE.Vector3();
          right.crossVectors(forward, camera.up).normalize();

          if (movementState.forward) moveDirection.add(forward);
          if (movementState.backward) moveDirection.sub(forward);
          if (movementState.right) moveDirection.add(right);
          if (movementState.left) moveDirection.sub(right);
        }
      } else {
        // World-relative movement for other cameras
        if (movementState.forward) moveDirection.z -= 1;
        if (movementState.backward) moveDirection.z += 1;
        if (movementState.right) moveDirection.x += 1;
        if (movementState.left) moveDirection.x -= 1;
      }

      if (moveDirection.length() > 0) {
        moveDirection.normalize();
        playerMovement.move(moveDirection);
      }
    };

    return { updateMovement };
  };

  const input = setupInput();

  // Setup audio
  const setupAudio = async () => {
    try {
      const createSyntheticSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
        const sampleRate = 44100;
        const length = sampleRate * duration;
        const buffer = soundManager['audioContext'].createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const envelope = Math.exp(-t * 3);
          data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }

        return buffer;
      };

      await soundManager.loadSound({
        id: "bounce",
        buffer: createSyntheticSound(220, 0.3),
        volume: 0.5,
        category: "sfx"
      });

      await soundManager.loadSound({
        id: "jump",
        buffer: createSyntheticSound(440, 0.2, 'square'),
        volume: 0.4,
        category: "sfx"
      });

      await soundManager.loadSound({
        id: "teleport",
        buffer: createSyntheticSound(880, 0.1, 'sawtooth'),
        volume: 0.3,
        category: "sfx"
      });

    } catch (error) {
      console.warn("Could not setup audio:", error);
    }
  };

  await setupAudio();

  // Camera switching with proper cleanup
  const switchToCamera = (cameraId: string, enableTransition = true) => {
    const currentCameraId = cameraManager.getActiveCameraId();

    // Exit pointer lock when switching away from FPS
    if (currentCameraId === 'first-person') {
      fpsMouseLook.disable();
    }

    // Disable current camera's controls
    const currentControls = controlManager.getControlsForCamera(currentCameraId);
    currentControls.forEach(control => {
      controlManager.disableControls(control.id);
    });

    // Switch camera - disable transitions for now to fix active camera tracking
    cameraManager.setActiveCamera(cameraId);
    enableCameraControls(cameraId);

  };

  const enableCameraControls = (cameraId: string) => {
    if (cameraId === 'first-person') {
      fpsMouseLook.reset();
    } else {
      const newControls = controlManager.getControlsForCamera(cameraId);
      const newCamera = cameraManager.getCamera(cameraId);

      newControls.forEach(control => {
        if (newCamera) {
          controlManager.syncControlsWithCamera(control.id, newCamera);
          controlManager.enableControls(control.id);
        }
      });
    }
  };

  // Main animation loop
  let animationTime = 0;
  const animateScene = (deltaTime: number) => {
    animationTime += deltaTime;

    // Update player movement
    playerMovement.update(deltaTime);

    // Update input movement
    input.updateMovement(deltaTime);

    // Ensure camera manager updates (for following)
    cameraManager.update();

    // Animate lights
    if (lights.pointLight1) {
      lights.pointLight1.position.x = Math.sin(animationTime) * 5;
      lights.pointLight1.position.z = Math.cos(animationTime) * 5;
    }

    if (lights.pointLight2) {
      lights.pointLight2.position.x = Math.cos(animationTime * 1.2) * 5;
      lights.pointLight2.position.z = Math.sin(animationTime * 1.2) * 5;
    }

    // Animate neon material
    if (materials.neon) {
      const intensity = 0.3 + Math.sin(animationTime * 3) * 0.2;
      materials.neon.emissiveIntensity = intensity;
    }
  };

  // Utility functions
  const explodeAllBouncers = () => {
    const bouncers = entities.filter(e => e.hasTag("bouncer"));
    bouncers.forEach(bouncer => {
      const randomForce = new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        Math.random() * 30 + 20,
        (Math.random() - 0.5) * 50
      );
      bouncer.applyImpulse(randomForce);
    });
    soundManager.play("bounce").catch(console.error);
  };

  const resetScene = () => {
    player.setPosition(0, 1, 0);
    playerMovement.velocity.set(0, 0, 0);

    const bouncers = entities.filter(e => e.hasTag("bouncer"));
    bouncers.forEach((bouncer) => {
      bouncer.setPosition(
        (Math.random() - 0.5) * 10,
        Math.random() * 10 + 5,
        (Math.random() - 0.5) * 10
      );
      bouncer.setVelocity(new THREE.Vector3(0, 0, 0));
    });
  };

  // Start the game
  game.start();

  // Start custom animation loop
  let lastUpdateTime = 0;
  const customAnimationLoop = () => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    animateScene(deltaTime);
    requestAnimationFrame(customAnimationLoop);
  };
  customAnimationLoop();

  console.log("🎮 Kitchen Sink Example V2 initialized!");

  return {
    game,
    entities,
    cameras,
    lights,
    materials,
    managers: {
      camera: cameraManager,
      control: controlManager,
      state: stateManager,
      physics: physicsManager,
      input: inputManager,
      sound: soundManager,
      asset: assetManager,
    },
    functions: {
      switchToCamera,
      explodeAllBouncers,
      resetScene,
      toggleControls: () => {
        // For V2, controls are automatically managed per camera type  
      },
    },
    cleanup: () => {
      inputManager.dispose();
      soundManager.dispose();
      assetManager.dispose();
      game.dispose();
    },
  };
}

// React hook for the new demo
export function useKitchenSinkGameStateV2<T>(
  game: GameWorld,
  selector?: (state: GameState) => T
) {
  if (typeof window === "undefined") {
    throw new Error("useKitchenSinkGameStateV2 can only be used in browser environment");
  }

  const stateHook = createStateHook(game.getStateManager());
  return stateHook(selector);
}