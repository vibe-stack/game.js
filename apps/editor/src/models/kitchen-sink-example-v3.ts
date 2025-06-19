import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
    GameWorld,
    InputManager,
    SoundManager,
    AssetManager,
    CharacterController,
    FPS_CHARACTER_CONFIG,
    THIRD_PERSON_CHARACTER_CONFIG,
    PLATFORMER_CHARACTER_CONFIG,
    createStateHook,
    type GameState,
    type InputBinding,
    type CharacterControllerConfig
} from "./index";

// Kitchen sink example with the new CharacterController system
export async function createKitchenSinkExampleV3(canvas: HTMLCanvasElement) {
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

    // Setup multiple preset cameras for comparison
    const setupPresetCameras = () => {
        // Wide overview camera (higher and further for larger environment)
        const overviewCamera = cameraManager.createPerspectiveCamera(
            "overview",
            "Overview Camera",
            {
                position: new THREE.Vector3(40, 35, 40),
                target: new THREE.Vector3(0, 0, 0),
                fov: 65
            }
        );

        // Side view camera for platformer-style view
        const sideCamera = cameraManager.createPerspectiveCamera(
            "side-view",
            "Side View Camera",
            {
                position: new THREE.Vector3(45, 15, 0),
                target: new THREE.Vector3(0, 0, 0),
                fov: 75
            }
        );

        return { overviewCamera, sideCamera };
    };

    const presetCameras = setupPresetCameras();

    // Setup orbit controls for preset cameras
    const setupOrbitControls = () => {
        const controls = [
            { id: "overview", camera: presetCameras.overviewCamera },
            { id: "side-view", camera: presetCameras.sideCamera }
        ];

        controls.forEach(({ id, camera }) => {
            const orbitControls = new OrbitControls(camera, canvas);
            orbitControls.enableDamping = true;
            orbitControls.dampingFactor = 0.05;
            orbitControls.enableZoom = true;
            orbitControls.enablePan = true;

            controlManager.addControls(
                `${id}-orbit`,
                `${id} Orbit Controls`,
                orbitControls,
                { enabled: false }
            );
            controlManager.associateWithCamera(`${id}-orbit`, id);
        });
    };

    setupOrbitControls();

    // Enhanced lighting setup
    const setupLighting = () => {
        // Remove default lighting first
        game.scene.clear();

        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        game.scene.add(ambientLight);

        // Main directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 3);
        sunLight.position.set(15, 25, 10);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.bias = 0.0001;
        sunLight.shadow.normalBias = 0.04;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        sunLight.shadow.camera.left = -25;
        sunLight.shadow.camera.right = 25;
        sunLight.shadow.camera.top = 25;
        sunLight.shadow.camera.bottom = -25;
        game.scene.add(sunLight);

        // Point lights for atmosphere
        const pointLight1 = new THREE.PointLight(0xff6644, 3, 15);
        pointLight1.position.set(8, 4, 8);
        pointLight1.castShadow = true;
        pointLight1.shadow.mapSize.width = 2048;
        pointLight1.shadow.mapSize.height = 2048;
        pointLight1.shadow.bias = 0.0001;
        pointLight1.shadow.normalBias = 0.04;
        game.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x4466ff, 6, 15);
        pointLight2.position.set(-8, 4, -8);
        pointLight2.castShadow = true;
        pointLight2.shadow.mapSize.width = 2048;
        pointLight2.shadow.mapSize.height = 2048;
        pointLight2.shadow.bias = 0.0001;
        pointLight2.shadow.normalBias = 0.04;
        game.scene.add(pointLight2);

        return { ambientLight, sunLight, pointLight1, pointLight2 };
    };

    const lights = setupLighting();

    // Create various materials
    const createMaterials = () => {
        const materials = {
            ground: new THREE.MeshStandardMaterial({
                color: 0x8a8a8a,
                metalness: 0.1,
                roughness: 0.9,
            }),
            character: new THREE.MeshStandardMaterial({
                color: 0x4444ff,
                metalness: 0.2,
                roughness: 0.6,
            }),
            platform: new THREE.MeshStandardMaterial({
                color: 0x66aa44,
                metalness: 0.3,
                roughness: 0.7,
            }),
            obstacle: new THREE.MeshStandardMaterial({
                color: 0xaa4444,
                metalness: 0.8,
                roughness: 0.3,
            }),
            interactive: new THREE.MeshStandardMaterial({
                color: 0xffaa44,
                metalness: 0.0,
                roughness: 0.8,
            }),
            neon: new THREE.MeshStandardMaterial({
                color: 0x00ff88,
                emissive: 0x004422,
                emissiveIntensity: 0.6,
            }),
        };

        return materials;
    };

    const materials = createMaterials();

    // Create environment and entities
    const createEnvironment = () => {
        const entities = [];

        // === GROUND AND FLOOR SYSTEM ===

        // Main ground plane (larger)
        const ground = game
            .createBox({
                size: new THREE.Vector3(60, 2, 60),
                name: "Ground",
                material: materials.ground
            })
            .setPosition(0, -6, 0)
            .enableStaticPhysics(0.8, 0.9)
            .addTag("ground");
        entities.push(ground);

        // Secondary floor areas
        const floor1 = game
            .createBox({
                size: new THREE.Vector3(20, 0.5, 20),
                name: "Floor Area 1",
                material: materials.platform
            })
            .setPosition(15, -4.5, 15)
            .enableStaticPhysics(0.7, 0.8)
            .addTag("floor");
        entities.push(floor1);

        const floor2 = game
            .createBox({
                size: new THREE.Vector3(15, 0.5, 25),
                name: "Floor Area 2",
                material: materials.platform
            })
            .setPosition(-20, -4.5, -10)
            .enableStaticPhysics(0.7, 0.8)
            .addTag("floor");
        entities.push(floor2);

        // === WALLS SYSTEM ===

        // Perimeter walls
        const wallHeight = 8;
        const wallThickness = 1;
        const arenaSize = 30;

        // North wall
        const northWall = game
            .createBox({
                size: new THREE.Vector3(arenaSize * 2, wallHeight, wallThickness),
                name: "North Wall",
                material: materials.obstacle
            })
            .setPosition(0, wallHeight / 2 - 5, arenaSize)
            .enableStaticPhysics(0.5, 0.7)
            .addTag("wall");
        entities.push(northWall);

        // South wall
        const southWall = game
            .createBox({
                size: new THREE.Vector3(arenaSize * 2, wallHeight, wallThickness),
                name: "South Wall",
                material: materials.obstacle
            })
            .setPosition(0, wallHeight / 2 - 5, -arenaSize)
            .enableStaticPhysics(0.5, 0.7)
            .addTag("wall");
        entities.push(southWall);

        // East wall
        const eastWall = game
            .createBox({
                size: new THREE.Vector3(wallThickness, wallHeight, arenaSize * 2),
                name: "East Wall",
                material: materials.obstacle
            })
            .setPosition(arenaSize, wallHeight / 2 - 5, 0)
            .enableStaticPhysics(0.5, 0.7)
            .addTag("wall");
        entities.push(eastWall);

        // West wall
        const westWall = game
            .createBox({
                size: new THREE.Vector3(wallThickness, wallHeight, arenaSize * 2),
                name: "West Wall",
                material: materials.obstacle
            })
            .setPosition(-arenaSize, wallHeight / 2 - 5, 0)
            .enableStaticPhysics(0.5, 0.7)
            .addTag("wall");
        entities.push(westWall);

        // Interior walls for maze-like structure
        const interiorWalls = [
            { pos: [10, wallHeight / 2 - 5, 0], size: [1, wallHeight, 15] },
            { pos: [-10, wallHeight / 2 - 5, 5], size: [1, wallHeight, 10] },
            { pos: [0, wallHeight / 2 - 5, 10], size: [20, wallHeight, 1] },
            { pos: [5, wallHeight / 2 - 5, -10], size: [15, wallHeight, 1] },
            { pos: [-15, wallHeight / 2 - 5, -5], size: [1, wallHeight, 20] },
        ];

        interiorWalls.forEach((wallData, index) => {
            const wall = game
                .createBox({
                    size: new THREE.Vector3(wallData.size[0], wallData.size[1], wallData.size[2]),
                    name: `Interior Wall ${index}`,
                    material: materials.obstacle
                })
                .setPosition(wallData.pos[0], wallData.pos[1], wallData.pos[2])
                .enableStaticPhysics(0.5, 0.7)
                .addTag("wall");
            entities.push(wall);
        });

        // === PLATFORMS AND ELEVATED AREAS ===

        // Multi-level platforms
        const platforms = [
            { pos: [8, -3, 8], size: [6, 1, 6], name: "Platform Level 1" },
            { pos: [8, -1, 8], size: [4, 1, 4], name: "Platform Level 2" },
            { pos: [8, 1, 8], size: [2, 1, 2], name: "Platform Level 3" },
            { pos: [-12, -2, 12], size: [8, 1, 4], name: "Side Platform 1" },
            { pos: [15, 0, -8], size: [6, 1, 6], name: "Side Platform 2" },
            { pos: [-8, 2, -15], size: [5, 1, 5], name: "High Platform" },
        ];

        platforms.forEach(platformData => {
            const platform = game
                .createBox({
                    size: new THREE.Vector3(platformData.size[0], platformData.size[1], platformData.size[2]),
                    name: platformData.name,
                    material: materials.platform
                })
                .setPosition(platformData.pos[0], platformData.pos[1], platformData.pos[2])
                .enableStaticPhysics(0.6, 0.8)
                .addTag("platform");
            entities.push(platform);
        });

        // Sloped platforms and ramps
        const ramps = [
            { pos: [-5, -2, 0], size: [6, 1, 4], rotation: [0, 0, Math.PI / 12], name: "Ramp 1" },
            { pos: [12, -1, -12], size: [8, 1, 3], rotation: [Math.PI / 15, 0, 0], name: "Ramp 2" },
            { pos: [-18, 0, -8], size: [4, 1, 8], rotation: [0, 0, -Math.PI / 10], name: "Ramp 3" },
        ];

        ramps.forEach(rampData => {
            const ramp = game
                .createBox({
                    size: new THREE.Vector3(rampData.size[0], rampData.size[1], rampData.size[2]),
                    name: rampData.name,
                    material: materials.platform
                })
                .setPosition(rampData.pos[0], rampData.pos[1], rampData.pos[2])
                .setRotation(rampData.rotation[0], rampData.rotation[1], rampData.rotation[2])
                .enableStaticPhysics(0.6, 0.8)
                .addTag("ramp");
            entities.push(ramp);
        });

        // === OBSTACLES AND STRUCTURES ===

        // Large structural obstacles
        const structures = [
            { pos: [0, 2, 0], size: [2, 8, 2], name: "Central Tower" },
            { pos: [-20, 1, 20], size: [3, 6, 3], name: "Corner Tower 1" },
            { pos: [20, 1, -20], size: [3, 6, 3], name: "Corner Tower 2" },
            { pos: [0, 0, 20], size: [4, 4, 2], name: "North Structure" },
            { pos: [20, 0, 0], size: [2, 4, 4], name: "East Structure" },
        ];

        structures.forEach(structData => {
            const structure = game
                .createBox({
                    size: new THREE.Vector3(structData.size[0], structData.size[1], structData.size[2]),
                    name: structData.name,
                    material: materials.obstacle
                })
                .setPosition(structData.pos[0], structData.pos[1], structData.pos[2])
                .enableStaticPhysics(0.5, 0.7)
                .addTag("structure");
            entities.push(structure);
        });

        // Random smaller obstacles
        for (let i = 0; i < 12; i++) {
            const obstacle = game
                .createBox({
                    size: new THREE.Vector3(
                        0.8 + Math.random() * 1.2,
                        1.5 + Math.random() * 3,
                        0.8 + Math.random() * 1.2
                    ),
                    name: `Obstacle ${i}`,
                    material: materials.obstacle
                })
                .setPosition(
                    (Math.random() - 0.5) * 40,
                    0,
                    (Math.random() - 0.5) * 40
                )
                .enableStaticPhysics(0.5, 0.7)
                .addTag("obstacle");
            entities.push(obstacle);
        }

        // === INTERACTIVE AND MOVABLE OBJECTS ===

        // Interactive spheres (more varied)
        for (let i = 0; i < 15; i++) {
            const radius = 0.4 + Math.random() * 0.6;
            const sphere = game
                .createSphere({
                    radius,
                    name: `Interactive Sphere ${i}`,
                    material: materials.interactive
                })
                .setPosition(
                    (Math.random() - 0.5) * 35,
                    Math.random() * 10 + 5,
                    (Math.random() - 0.5) * 35
                )
                .enableDynamicPhysics(0.5 + Math.random() * 2, 0.7, 0.3)
                .addTag("interactive")
                .onClick(() => {
                    sphere.applyImpulse(new THREE.Vector3(
                        (Math.random() - 0.5) * 20,
                        Math.random() * 12 + 8,
                        (Math.random() - 0.5) * 20
                    ));
                    soundManager.play("bounce").catch(console.error);
                });
            entities.push(sphere);
        }

        // Movable boxes
        for (let i = 0; i < 8; i++) {
            const size = 0.8 + Math.random() * 0.8;
            const box = game
                .createBox({
                    size: new THREE.Vector3(size, size, size),
                    name: `Movable Box ${i}`,
                    material: materials.interactive
                })
                .setPosition(
                    (Math.random() - 0.5) * 30,
                    Math.random() * 5 + 3,
                    (Math.random() - 0.5) * 30
                )
                .enableDynamicPhysics(1.0 + Math.random() * 2, 0.6, 0.4)
                .addTag("movable")
                .onClick(() => {
                    box.applyImpulse(new THREE.Vector3(
                        (Math.random() - 0.5) * 15,
                        Math.random() * 8 + 5,
                        (Math.random() - 0.5) * 15
                    ));
                    soundManager.play("bounce").catch(console.error);
                });
            entities.push(box);
        }

        // Special glowing objects
        for (let i = 0; i < 5; i++) {
            const glowSphere = game
                .createSphere({
                    radius: 0.6,
                    name: `Glow Sphere ${i}`,
                    material: materials.neon
                })
                .setPosition(
                    (Math.random() - 0.5) * 25,
                    Math.random() * 8 + 4,
                    (Math.random() - 0.5) * 25
                )
                .enableDynamicPhysics(0.3, 0.9, 0.1) // Light and bouncy
                .addTag("special")
                .onClick(() => {
                    glowSphere.applyImpulse(new THREE.Vector3(
                        (Math.random() - 0.5) * 25,
                        Math.random() * 15 + 10,
                        (Math.random() - 0.5) * 25
                    ));
                    soundManager.play("bounce").catch(console.error);
                });
            entities.push(glowSphere);
        }

        return entities;
    };

    const entities = createEnvironment();

    // Create the player character
    const createPlayer = () => {
        const player = game
            .createSphere({
                radius: 0.8,
                name: "Player Character",
                material: materials.character
            })
            .setPosition(0, 20, 0) // Start on the ground (ground surface at Y=-5, player radius 0.8, so center at Y=-4.2)
            .enableKinematicPhysics() // Use kinematic physics for smooth movement
            .addTag("player");

        // Ensure the player has the physics manager
        player.setPhysicsManager(physicsManager);

        console.log("Player created with physics:", {
            entityId: player.entityId,
            hasPhysicsManager: !!player['physicsManager'],
            rigidBodyId: player['rigidBodyId'],
            colliderId: player['colliderId']
        });

        return player;
    };

    const player = createPlayer();
    entities.push(player);

    // Character controller configurations for different modes
    const characterConfigs: { [key: string]: Partial<CharacterControllerConfig> } = {
        fps: {
            ...FPS_CHARACTER_CONFIG,
            cameraHeight: 1.8,
            maxSpeed: 12.0,
            jumpForce: 18.0,
        },
        thirdPerson: {
            ...THIRD_PERSON_CHARACTER_CONFIG,
            cameraDistance: -6.0,
            cameraHeight: 2.0,
            maxSpeed: 12.0,
            jumpForce: 15.0,
            autoStepIncludeDynamic: true,
            autoStepMinWidth: 0.5,
            autoStepMaxHeight: 1,
        },
        platformer: {
            ...PLATFORMER_CHARACTER_CONFIG,
            cameraDistance: -15.0,
            cameraHeight: 3.0,
            maxSpeed: 10.0,
            jumpForce: 10.0,
        },
    };

    // Initialize character controllers
    const characterControllers: { [key: string]: CharacterController } = {};

    Object.keys(characterConfigs).forEach(mode => {
        characterControllers[mode] = new CharacterController(
            player,
            cameraManager,
            physicsManager,
            inputManager,
            characterConfigs[mode]
        );
    });

    // Current character controller
    let currentControllerMode = "fps";
    let currentController = characterControllers[currentControllerMode];
    currentController.activateCamera();

    // Setup controller switching
    const switchCharacterMode = (mode: string) => {
        if (characterControllers[mode] && mode !== currentControllerMode) {
            // Deactivate current controller
            currentController.deactivate();

            // Switch to new controller
            currentControllerMode = mode;
            currentController = characterControllers[mode];
            currentController.activateCamera();

            console.log(`Switched to ${mode} character controller`);
        }
    };

    // Setup camera switching between character and preset cameras
    const switchToPresetCamera = (cameraId: string) => {
        // Deactivate current character controller
        currentController.deactivate();

        // Switch to preset camera
        cameraManager.setActiveCamera(cameraId);

        // Enable corresponding orbit controls
        const controls = controlManager.getControlsForCamera(cameraId);
        controls.forEach(control => {
            const camera = cameraManager.getCamera(cameraId);
            if (camera) {
                controlManager.syncControlsWithCamera(control.id, camera);
                controlManager.enableControls(control.id);
            }
        });
    };

    const switchBackToCharacter = () => {
        // Disable all orbit controls
        const allControls = controlManager.getAllControls();
        allControls.forEach(control => {
            controlManager.disableControls(control.id);
        });

        // Reactivate current character controller
        currentController.activateCamera();
    };

    // Utility functions (defined before setupModeSwitching to avoid reference errors)
    const explodeAllSpheres = () => {
        // Explode all interactive objects
        const interactiveObjects = entities.filter(e =>
            e.hasTag("interactive") || e.hasTag("movable") || e.hasTag("special")
        );

        interactiveObjects.forEach(obj => {
            const randomForce = new THREE.Vector3(
                (Math.random() - 0.5) * 60,
                Math.random() * 40 + 25,
                (Math.random() - 0.5) * 60
            );
            obj.applyImpulse(randomForce);
        });

        soundManager.play("bounce").catch(console.error);
    };

    const resetScene = () => {
        // Reset player (position just above ground level)  
        player.setPosition(0, -4, 0); // Ground surface at Y=-5, player radius 0.8, so Y=-4.2 is on ground, Y=-4 is just above
        player.setVelocity(new THREE.Vector3(0, 0, 0));

        // Reset all interactive spheres
        const spheres = entities.filter(e => e.hasTag("interactive"));
        spheres.forEach((sphere, index) => {
            sphere.setPosition(
                (Math.random() - 0.5) * 35,
                Math.random() * 10 + 5,
                (Math.random() - 0.5) * 35
            );
            sphere.setVelocity(new THREE.Vector3(0, 0, 0));
        });

        // Reset movable boxes
        const boxes = entities.filter(e => e.hasTag("movable"));
        boxes.forEach((box, index) => {
            box.setPosition(
                (Math.random() - 0.5) * 30,
                Math.random() * 5 + 3,
                (Math.random() - 0.5) * 30
            );
            box.setVelocity(new THREE.Vector3(0, 0, 0));
        });

        // Reset special glowing objects
        const glowSpheres = entities.filter(e => e.hasTag("special"));
        glowSpheres.forEach((glowSphere, index) => {
            glowSphere.setPosition(
                (Math.random() - 0.5) * 25,
                Math.random() * 8 + 4,
                (Math.random() - 0.5) * 25
            );
            glowSphere.setVelocity(new THREE.Vector3(0, 0, 0));
        });
    };

    // Setup input bindings for mode switching
    const setupModeSwitching = () => {
        const bindings: InputBinding[] = [
            // Character controller modes
            {
                id: "switch-fps",
                name: "Switch to FPS Mode",
                inputs: [{ type: "keyboard", key: "Digit1" }],
                callback: () => {
                    switchBackToCharacter();
                    switchCharacterMode("fps");
                }
            },
            {
                id: "switch-third-person",
                name: "Switch to Third Person Mode",
                inputs: [{ type: "keyboard", key: "Digit2" }],
                callback: () => {
                    switchBackToCharacter();
                    switchCharacterMode("thirdPerson");
                }
            },
            {
                id: "switch-platformer",
                name: "Switch to Platformer Mode",
                inputs: [{ type: "keyboard", key: "Digit3" }],
                callback: () => {
                    switchBackToCharacter();
                    switchCharacterMode("platformer");
                }
            },
            // Preset cameras
            {
                id: "switch-overview",
                name: "Switch to Overview Camera",
                inputs: [{ type: "keyboard", key: "Digit4" }],
                callback: () => switchToPresetCamera("overview")
            },
            {
                id: "switch-side-view",
                name: "Switch to Side View Camera",
                inputs: [{ type: "keyboard", key: "Digit5" }],
                callback: () => switchToPresetCamera("side-view")
            },
            // Utility functions
            {
                id: "explode-spheres",
                name: "Explode All Spheres",
                inputs: [{ type: "keyboard", key: "KeyE" }],
                callback: explodeAllSpheres
            },
            {
                id: "reset-scene",
                name: "Reset Scene",
                inputs: [{ type: "keyboard", key: "KeyR" }],
                callback: resetScene
            }
        ];

        bindings.forEach(binding => inputManager.addBinding(binding));
    };

    setupModeSwitching();

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
                buffer: createSyntheticSound(330, 0.4),
                volume: 0.5,
                category: "sfx"
            });

            await soundManager.loadSound({
                id: "jump",
                buffer: createSyntheticSound(550, 0.2, 'square'),
                volume: 0.4,
                category: "sfx"
            });

        } catch (error) {
            console.warn("Could not setup audio:", error);
        }
    };

    await setupAudio();

    // Main animation loop
    let animationTime = 0;
    const animateScene = (deltaTime: number) => {
        animationTime += deltaTime;

        // Update only the current active character controller
        currentController.update(deltaTime);

        // Update camera manager for following
        cameraManager.update();

        // Animate lights
        if (lights.pointLight1) {
            lights.pointLight1.position.x = Math.sin(animationTime * 0.8) * 8;
            lights.pointLight1.position.z = Math.cos(animationTime * 0.8) * 8;
        }

        if (lights.pointLight2) {
            lights.pointLight2.position.x = Math.cos(animationTime * 1.1) * 8;
            lights.pointLight2.position.z = Math.sin(animationTime * 1.1) * 8;
        }

        // Animate neon material
        if (materials.neon) {
            const intensity = 0.4 + Math.sin(animationTime * 4) * 0.3;
            materials.neon.emissiveIntensity = intensity;
        }
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

    return {
        game,
        entities,
        player,
        characterControllers,
        presetCameras,
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
            switchCharacterMode,
            switchToPresetCamera,
            switchBackToCharacter,
            explodeAllSpheres,
            resetScene,
            getCurrentController: () => currentController,
            getCurrentMode: () => currentControllerMode,
        },
        cleanup: () => {
            Object.values(characterControllers).forEach(controller => controller.dispose());
            inputManager.dispose();
            soundManager.dispose();
            assetManager.dispose();
            game.dispose();
        },
    };
}

// React hook for the new demo
export function useKitchenSinkGameStateV3<T>(
    game: GameWorld,
    selector?: (state: GameState) => T
) {
    if (typeof window === "undefined") {
        throw new Error("useKitchenSinkGameStateV3 can only be used in browser environment");
    }

    const stateHook = createStateHook(game.getStateManager());
    return stateHook(selector);
}