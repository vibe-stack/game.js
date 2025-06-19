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
  type AssetManifest 
} from "./index";

// Comprehensive game example showcasing all engine features
export async function createKitchenSinkExample(canvas: HTMLCanvasElement) {
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

    // First person camera
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

  // Setup orbit controls for all cameras
  const setupControls = () => {
    const controls = [
      { id: "default", camera: cameraManager.getCamera("default")! },
      { id: "top-view", camera: cameras.topCamera },
      { id: "side-view", camera: cameras.sideCamera },
      { id: "first-person", camera: cameras.firstPersonCamera },
      { id: "cinematic", camera: cameras.cinematicCamera }
    ];

    controls.forEach(({ id, camera }, index) => {
      const orbitControls = new OrbitControls(camera, canvas);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.enableZoom = true;
      orbitControls.enablePan = true;
      
      // Different control settings for different cameras
      if (id === "first-person") {
        // Disable orbit controls for FPS camera (we'll use mouse look instead)
        orbitControls.enabled = false;
      }

      controlManager.addControls(
        `${id}-orbit`, 
        `${id} Orbit Controls`, 
        orbitControls, 
        { enabled: index === 0 && id !== 'first-person' }
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

    // Spot light for dramatic effect
    const spotLight = new THREE.SpotLight(0xffffff, 0.8, 15, Math.PI / 6, 0.1);
    spotLight.position.set(0, 10, 0);
    spotLight.target.position.set(0, 0, 0);
    spotLight.castShadow = true;
    game.scene.add(spotLight);
    game.scene.add(spotLight.target);

    return { ambientLight, sunLight, pointLight1, pointLight2, spotLight };
  };

  const lights = setupLighting();

  // Create various materials to showcase different rendering techniques
  const createMaterials = () => {
    const materials = {
      // Standard PBR materials
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
      // Emissive material
      neon: new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x004400,
        emissiveIntensity: 0.5,
      }),
      // Wireframe material
      wireframe: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
      }),
      // Normal material for debugging
      normal: new THREE.MeshNormalMaterial(),
    };

    return materials;
  };

  const materials = createMaterials();

  // Create diverse physics entities
  const createPhysicsEntities = () => {
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

    // Player sphere with special interactions
    const playerSphere = game
      .createSphere({ 
        radius: 1, 
        name: "Player Ball",
        material: materials.plastic
      })
      .setPosition(0, 1, 0)
      .enableDynamicPhysics(1, 0.8, 0.3)
      .addTag("player")
      .onClick((event) => {
        // Apply random impulse
        const impulse = new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          Math.random() * 30 + 10,
          (Math.random() - 0.5) * 20
        );
        playerSphere.applyImpulse(impulse);
        
        // Play sound effect
        soundManager.play("bounce").catch(console.error);
        
        // Change color temporarily
        const originalColor = (playerSphere.getMesh().material as THREE.MeshStandardMaterial).color.clone();
        (playerSphere.getMesh().material as THREE.MeshStandardMaterial).color.setHex(0x00ff00);
        setTimeout(() => {
          (playerSphere.getMesh().material as THREE.MeshStandardMaterial).color.copy(originalColor);
        }, 500);
      })
      .onHover((event) => {
        console.log("Player sphere hovered!", event);
      });
    entities.push(playerSphere);

    // Bouncing spheres with different materials
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
          // Teleport to random position
          sphere.setPosition(
            (Math.random() - 0.5) * 15,
            Math.random() * 10 + 10,
            (Math.random() - 0.5) * 15
          );
          soundManager.play("teleport").catch(console.error);
        });
      entities.push(sphere);
    }

    // Kinematic moving platform
    const platform = game
      .createBox({ 
        size: new THREE.Vector3(4, 0.5, 4), 
        name: "Moving Platform",
        material: materials.glass
      })
      .setPosition(5, 2, 0)
      .enableKinematicPhysics()
      .addTag("platform");
    entities.push(platform);

    // Static obstacles with different shapes
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

    const obstacle2 = game
      .createBox({ 
        size: new THREE.Vector3(6, 0.5, 1), 
        name: "Wall",
        material: materials.wireframe
      })
      .setPosition(0, 1, -8)
      .enableStaticPhysics(0.3, 0.7)
      .addTag("obstacle");
    entities.push(obstacle2);

    return entities;
  };

  const entities = createPhysicsEntities();

  // Setup input bindings for comprehensive control
  const setupInputBindings = () => {
    // Camera switching
    const cameraBindings: InputBinding[] = [
      {
        id: "camera-1",
        name: "Switch to Default Camera",
        inputs: [{ type: "keyboard", key: "Digit1" }],
        callback: () => switchToCamera("default"),
      },
      {
        id: "camera-2", 
        name: "Switch to Top View",
        inputs: [{ type: "keyboard", key: "Digit2" }],
        callback: () => switchToCamera("top-view"),
      },
      {
        id: "camera-3",
        name: "Switch to Side View", 
        inputs: [{ type: "keyboard", key: "Digit3" }],
        callback: () => switchToCamera("side-view"),
      },
      {
        id: "camera-4",
        name: "Switch to First Person",
        inputs: [{ type: "keyboard", key: "Digit4" }],
        callback: () => switchToCamera("first-person"),
      },
      {
        id: "camera-5",
        name: "Switch to Cinematic",
        inputs: [{ type: "keyboard", key: "Digit5" }],
        callback: () => switchToCamera("cinematic"),
      },
    ];

    // Player controls
    const playerBindings: InputBinding[] = [
      {
        id: "jump",
        name: "Jump",
        inputs: [
          { type: "keyboard", key: "Space" },
          { type: "gamepad", button: 0 }
        ],
        callback: () => {
          const player = entities.find(e => e.hasTag("player"));
          if (player) {
            player.applyImpulse(new THREE.Vector3(0, 15, 0));
            soundManager.play("jump").catch(console.error);
          }
        },
      },
      {
        id: "move-forward",
        name: "Move Forward",
        inputs: [{ type: "keyboard", key: "KeyW" }],
        continuous: true,
        callback: () => movePlayer("forward"),
      },
      {
        id: "move-backward", 
        name: "Move Backward",
        inputs: [{ type: "keyboard", key: "KeyS" }],
        continuous: true,
        callback: () => movePlayer("backward"),
      },
      {
        id: "move-left",
        name: "Move Left", 
        inputs: [{ type: "keyboard", key: "KeyA" }],
        continuous: true,
        callback: () => movePlayer("left"),
      },
      {
        id: "move-right",
        name: "Move Right",
        inputs: [{ type: "keyboard", key: "KeyD" }],
        continuous: true,
        callback: () => movePlayer("right"),
      },
      {
        id: "explode",
        name: "Explode",
        inputs: [{ type: "keyboard", key: "KeyE" }],
        callback: () => explodeAllBouncers(),
      },
      {
        id: "reset",
        name: "Reset Scene",
        inputs: [{ type: "keyboard", key: "KeyR" }],
        callback: () => resetScene(),
      },
    ];

    // Physics controls
    const physicsBindings: InputBinding[] = [
      {
        id: "reset-physics",
        name: "Reset Physics",
        inputs: [{ type: "keyboard", key: "KeyP" }],
        callback: () => {
          physicsManager.reset();
          console.log("Physics world reset");
        },
      },
      {
        id: "change-gravity",
        name: "Change Gravity",
        inputs: [{ type: "keyboard", key: "KeyT" }],
        callback: () => {
          const currentGravity = physicsManager.getGravity();
          const newGravity = currentGravity.y === -9.81 
            ? new THREE.Vector3(0, -2, 0) 
            : new THREE.Vector3(0, -9.81, 0);
          physicsManager.setGravity(newGravity);
          console.log(`Gravity set to: ${newGravity.y}`);
        },
      },
    ];

    // Audio controls
    const audioBindings: InputBinding[] = [
      {
        id: "play-music",
        name: "Toggle Background Music",
        inputs: [{ type: "keyboard", key: "KeyM" }],
        callback: () => {
          if (soundManager.isPlaying("background")) {
            soundManager.pause("background");
          } else {
            soundManager.play("background").catch(console.error);
          }
        },
      },
      {
        id: "sound-effect",
        name: "Play Random Sound",
        inputs: [{ type: "keyboard", key: "KeyS" }],
        callback: () => {
          const sounds = ["bounce", "teleport", "jump", "explosion"];
          const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
          soundManager.play(randomSound).catch(console.error);
        },
      },
    ];

    // Add all bindings
    [...cameraBindings, ...playerBindings, ...physicsBindings, ...audioBindings].forEach(binding => {
      inputManager.addBinding(binding);
    });
  };

  // Setup sound effects (using Web Audio API synthesis for demo)
  const setupAudio = async () => {
    try {
      // Create simple synthesized sounds for demo
      const createSyntheticSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
        const sampleRate = 44100;
        const length = sampleRate * duration;
        const buffer = soundManager['audioContext'].createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const envelope = Math.exp(-t * 3); // Exponential decay
          data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
        
        return buffer;
      };

      // Load synthetic sound effects
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

      await soundManager.loadSound({
        id: "explosion",
        buffer: createSyntheticSound(110, 0.5, 'sawtooth'),
        volume: 0.6,
        category: "sfx"
      });

      // Create a simple background music loop
      const createMusicLoop = () => {
        const sampleRate = 44100;
        const duration = 4; // 4 second loop
        const length = sampleRate * duration;
        const buffer = soundManager['audioContext'].createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        const notes = [220, 246.94, 277.18, 293.66]; // A, B, C#, D
        const noteDuration = duration / notes.length;
        
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const noteIndex = Math.floor(t / noteDuration);
          const noteTime = t % noteDuration;
          const frequency = notes[noteIndex];
          const envelope = Math.sin(Math.PI * noteTime / noteDuration) * 0.1;
          data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope;
        }
        
        return buffer;
      };

      await soundManager.loadSound({
        id: "background",
        buffer: createMusicLoop(),
        volume: 0.2,
        loop: true,
        category: "music"
      });

    } catch (error) {
      console.warn("Could not setup audio:", error);
    }
  };

  await setupAudio();
  setupInputBindings();

  // FPS Controls State
  let isMouseLocked = false;
  let mouseMovement = { x: 0, y: 0 };
  let cameraRotation = { pitch: 0, yaw: 0 };
  const maxPitch = Math.PI / 2 - 0.1; // Prevent camera flip

  // Setup FPS mouse controls
  const setupFPSControls = () => {
    console.log("Setting up FPS controls");
    
    canvas.addEventListener('click', () => {
      if (cameraManager.getActiveCameraId() === 'first-person') {
        console.log("Requesting pointer lock");
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      isMouseLocked = document.pointerLockElement === canvas;
      console.log("Pointer lock changed:", isMouseLocked);
    });

    document.addEventListener('mousemove', (event) => {
      if (isMouseLocked && cameraManager.getActiveCameraId() === 'first-person') {
        const sensitivity = 0.002;
        mouseMovement.x = event.movementX * sensitivity;
        mouseMovement.y = event.movementY * sensitivity;
        
        cameraRotation.yaw -= mouseMovement.x;
        cameraRotation.pitch -= mouseMovement.y;
        cameraRotation.pitch = Math.max(-maxPitch, Math.min(maxPitch, cameraRotation.pitch));
        
        console.log("Mouse look:", { yaw: cameraRotation.yaw, pitch: cameraRotation.pitch });
      }
    });

    // Exit pointer lock on escape
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && isMouseLocked) {
        console.log("Escape pressed, exiting pointer lock");
        document.exitPointerLock();
      }
    });
  };

  setupFPSControls();

  // Player movement function
  const movePlayer = (direction: "forward" | "backward" | "left" | "right") => {
    const player = entities.find(e => e.hasTag("player"));
    if (!player) return;

    const moveForce = 8; // Adjust movement strength
    let forceVector = new THREE.Vector3();

    if (cameraManager.getActiveCameraId() === 'first-person') {
      // Movement relative to camera direction (FPS style)
      const camera = cameraManager.getCamera("first-person");
      if (camera) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Get right direction for strafing
        const rightDirection = new THREE.Vector3();
        rightDirection.crossVectors(cameraDirection, camera.up).normalize();
        
        switch (direction) {
          case "forward":
            forceVector.copy(cameraDirection).multiplyScalar(moveForce);
            forceVector.y = 0; // Keep movement horizontal
            break;
          case "backward":
            forceVector.copy(cameraDirection).multiplyScalar(-moveForce);
            forceVector.y = 0;
            break;
          case "left":
            forceVector.copy(rightDirection).multiplyScalar(-moveForce);
            break;
          case "right":
            forceVector.copy(rightDirection).multiplyScalar(moveForce);
            break;
        }
      }
    } else {
      // Movement relative to world directions (other cameras)
      switch (direction) {
        case "forward":
          forceVector.set(0, 0, -moveForce);
          break;
        case "backward":
          forceVector.set(0, 0, moveForce);
          break;
        case "left":
          forceVector.set(-moveForce, 0, 0);
          break;
        case "right":
          forceVector.set(moveForce, 0, 0);
          break;
      }
    }

    // Apply the force to the player
    player.applyForce(forceVector);
  };

  // Animation and movement functions
  let animationTime = 0;
  const animateScene = (deltaTime: number) => {
    animationTime += deltaTime;

    // Update first-person camera to follow player
    const player = entities.find(e => e.hasTag("player"));
    const firstPersonCamera = cameraManager.getCamera("first-person");
    
    if (player && firstPersonCamera && cameraManager.getActiveCameraId() === 'first-person') {
      // Position camera at player's position with eye height offset
      const eyeHeight = 1.8;
      const newPosition = player.position.clone();
      newPosition.y += eyeHeight;
      
      firstPersonCamera.position.copy(newPosition);
      
      // Apply mouse look rotation
      firstPersonCamera.rotation.order = 'YXZ';
      firstPersonCamera.rotation.y = cameraRotation.yaw;
      firstPersonCamera.rotation.x = cameraRotation.pitch;
      
      // Debug logging every few frames
      if (Math.floor(animationTime * 10) % 30 === 0) {
        console.log("FPS Camera Update:", {
          playerPos: player.position,
          cameraPos: firstPersonCamera.position,
          rotation: { yaw: cameraRotation.yaw, pitch: cameraRotation.pitch }
        });
      }
    }

    // Animate moving platform
    const platform = entities.find(e => e.hasTag("platform"));
    if (platform) {
      const x = 5 + Math.sin(animationTime * 0.5) * 3;
      const y = 2 + Math.sin(animationTime * 0.7) * 1;
      platform.setPosition(x, y, 0);
    }

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
  const switchToCamera = (cameraId: string, enableTransition = true) => {
    const currentCameraId = cameraManager.getActiveCameraId();
    
    // Exit pointer lock when switching away from FPS camera
    if (currentCameraId === 'first-person' && document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Disable current camera's controls
    const currentControls = controlManager.getControlsForCamera(currentCameraId);
    currentControls.forEach(control => {
      controlManager.disableControls(control.id);
    });

    // Switch camera
    if (enableTransition) {
      cameraManager.setActiveCamera(cameraId, {
        duration: 1000,
        easing: (t) => t * t * (3.0 - 2.0 * t),
        onComplete: () => {
          const newControls = controlManager.getControlsForCamera(cameraId);
          const newCamera = cameraManager.getCamera(cameraId);
          
          newControls.forEach(control => {
            if (newCamera && cameraId !== 'first-person') {
              controlManager.syncControlsWithCamera(control.id, newCamera);
              controlManager.enableControls(control.id);
            }
          });

          // Initialize FPS camera position if switching to it
          if (cameraId === 'first-person') {
            initializeFPSCamera();
          }
        }
      });
    } else {
      cameraManager.setActiveCamera(cameraId);
      
      const newControls = controlManager.getControlsForCamera(cameraId);
      const newCamera = cameraManager.getCamera(cameraId);
      
      newControls.forEach(control => {
        if (newCamera && cameraId !== 'first-person') {
          controlManager.syncControlsWithCamera(control.id, newCamera);
          controlManager.enableControls(control.id);
        }
      });

      // Initialize FPS camera position if switching to it
      if (cameraId === 'first-person') {
        initializeFPSCamera();
      }
    }
  };

  // Initialize FPS camera position
  const initializeFPSCamera = () => {
    const player = entities.find(e => e.hasTag("player"));
    const firstPersonCamera = cameraManager.getCamera("first-person");
    
    if (player && firstPersonCamera) {
      const eyeHeight = 1.8;
      firstPersonCamera.position.copy(player.position);
      firstPersonCamera.position.y += eyeHeight;
      
      // Reset camera rotation
      cameraRotation.pitch = 0;
      cameraRotation.yaw = 0;
      firstPersonCamera.rotation.set(0, 0, 0);
      firstPersonCamera.rotation.order = 'YXZ';
      
      console.log("FPS Camera initialized:", {
        playerPos: player.position,
        cameraPos: firstPersonCamera.position
      });
    }
  };

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
    soundManager.play("explosion").catch(console.error);
  };

  const resetScene = () => {
    // Reset all entities to their starting positions
    const player = entities.find(e => e.hasTag("player"));
    if (player) {
      player.setPosition(0, 5, 0);
      player.setVelocity(new THREE.Vector3(0, 0, 0));
    }

    const bouncers = entities.filter(e => e.hasTag("bouncer"));
    bouncers.forEach((bouncer, index) => {
      bouncer.setPosition(
        (Math.random() - 0.5) * 10,
        Math.random() * 10 + 5,
        (Math.random() - 0.5) * 10
      );
      bouncer.setVelocity(new THREE.Vector3(0, 0, 0));
    });
  };

  const toggleControls = () => {
    const currentCameraId = cameraManager.getActiveCameraId();
    const controls = controlManager.getControlsForCamera(currentCameraId);
    
    controls.forEach(control => {
      controlManager.toggleControls(control.id);
    });
  };

  // Start the game loop
  game.start();

  // Add custom animation loop that integrates with the main game loop
  let lastUpdateTime = 0;
  const customAnimationLoop = () => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;
    
    animateScene(deltaTime);
    requestAnimationFrame(customAnimationLoop);
  };
  customAnimationLoop();

  // State management subscriptions
//   stateManager.subscribe((state) => {
//     console.log("Game state updated:", {
//       entityCount: state.entities.size,
//       physicsEnabled: state.physics.enabled,
//       activeCamera: state.scene.activeCamera,
//     });
//   });

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
      toggleControls,
      explodeAllBouncers,
      resetScene,
    },
    cleanup: () => {
      inputManager.dispose();
      soundManager.dispose();
      assetManager.dispose();
      game.dispose();
    },
  };
}

// React hook for the kitchen sink demo
export function useKitchenSinkGameState<T>(
  game: GameWorld,
  selector?: (state: GameState) => T
) {
  if (typeof window === "undefined") {
    throw new Error("useKitchenSinkGameState can only be used in browser environment");
  }
  
  const stateHook = createStateHook(game.getStateManager());
  return stateHook(selector);
}