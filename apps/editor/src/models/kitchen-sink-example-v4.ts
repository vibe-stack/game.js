import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
    GameWorld,
    InputManager,
    SoundManager,
    AssetManager,
    CharacterController,
    THIRD_PERSON_CHARACTER_CONFIG,
    Heightfield,
    CustomHeightfield,
    Sphere,
    Box,
    Cylinder,
    Cone,
    Torus,
    Capsule,
    Ring,
    Tetrahedron,
    Octahedron,
    Dodecahedron,
    Icosahedron,
    createStateHook,
    type GameState,
    type InputBinding,
    type CharacterControllerConfig
} from "./index";

// Kitchen sink v4 with terrain, various primitives, orbital lighting, and physics debug rendering
// 
// Debug Features:
// - Press P: Toggle physics debug wireframes (shows Rapier collision shapes)
// - Press D: Toggle entity debug rendering (individual entity debug state)
// - Press E: Explode all dynamic objects with random forces
// - Press R: Reset all objects to random positions
// - Press I: Log detailed physics information to console
// - On-screen status indicator shows current debug state and object counts
// 
// Physics Debug Rendering:
// - Uses Rapier's built-in debugRender() to visualize collision shapes
// - Shows rigid body outlines, collider shapes, and physics constraints
// - Colors are automatically assigned by Rapier based on body type and state
// - Updates in real-time as objects move and interact
export async function createKitchenSinkExampleV4(canvas: HTMLCanvasElement) {
    const game = new GameWorld({
        canvas,
        enablePhysics: true,
        gravity: new THREE.Vector3(0, -18, 0), // Stronger gravity for more dynamic feel
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

    // Initialize audio system
    try {
        await soundManager.initialize();
    } catch (error) {
        console.warn("Audio system initialization failed, continuing without audio:", error);
    }

    // Enhanced lighting setup with orbital lights
    const setupOrbitalLighting = () => {
        // Remove default lighting first
        game.scene.clear();

        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x2a2a4a, 1.5);
        game.scene.add(ambientLight);

        // Main directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 4);
        sunLight.position.set(30, 40, 15);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.bias = -0.001;
        sunLight.shadow.normalBias = 0.05;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 100;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        game.scene.add(sunLight);

        // Create multiple orbital lights with different colors and properties
        const orbitalLights: any[] = [];
        const lightColors = [
            { color: 0xff4444, intensity: 8 },  // Red
            { color: 0x44ff44, intensity: 8 },  // Green
            { color: 0x4444ff, intensity: 8 },  // Blue
            { color: 0xffff44, intensity: 8 },  // Yellow
            { color: 0xff44ff, intensity: 8 },  // Magenta
            { color: 0x44ffff, intensity: 8 },  // Cyan
            { color: 0xff8844, intensity: 8 },  // Orange
            { color: 0x8844ff, intensity: 8 },  // Purple
        ];

        lightColors.forEach((lightData, index) => {
            const light = new THREE.PointLight(lightData.color, lightData.intensity, 25, 2);
            // Only enable shadows on a few lights to stay under WebGPU texture limits
            light.castShadow = index < 3; // Only first 3 lights cast shadows
            if (light.castShadow) {
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
                light.shadow.bias = -0.001;
                light.shadow.normalBias = 0.04;
                light.shadow.camera.near = 0.1;
                light.shadow.camera.far = 25;
            }
            
            // Position lights in a ring around the scene
            const angle = (index / lightColors.length) * Math.PI * 2;
            const radius = 20 + Math.sin(index) * 5;
            const height = 8 + Math.cos(index * 1.3) * 4;
            
            light.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            game.scene.add(light);
            orbitalLights.push({
                light,
                baseAngle: angle,
                baseRadius: radius,
                baseHeight: height,
                speed: 0.3 + Math.random() * 0.4,
                radiusVariation: 3 + Math.random() * 2,
                heightVariation: 2 + Math.random() * 3,
            });

            // Add light helper spheres for visual effect
            const lightSphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 8, 6),
                new THREE.MeshBasicMaterial({ 
                    color: lightData.color,
                    transparent: true,
                    opacity: 0.8
                })
            );
            lightSphere.position.copy(light.position);
            game.scene.add(lightSphere);
            orbitalLights[orbitalLights.length - 1].visualSphere = lightSphere;
        });

        return { ambientLight, sunLight, orbitalLights };
    };

    const lights = setupOrbitalLighting();

    // Create diverse materials with different properties
    const createDiverseMaterials = () => {
        const materials = {
            // Terrain material
            terrain: new THREE.MeshStandardMaterial({
                color: 0x4a5a3a,
                metalness: 0.1,
                roughness: 0.95,
                // transparent: true,
                // opacity: 0.5,
                side: THREE.DoubleSide,
            }),
            
            // Character material
            character: new THREE.MeshStandardMaterial({
                color: 0x3366ff,
                metalness: 0.3,
                roughness: 0.4,
                emissive: 0x001133,
                emissiveIntensity: 0.2,
            }),
            
            // Metallic materials
            chrome: new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 1.0,
                roughness: 0.1,
            }),
            
            gold: new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 1.0,
                roughness: 0.2,
            }),
            
            copper: new THREE.MeshStandardMaterial({
                color: 0xb87333,
                metalness: 1.0,
                roughness: 0.3,
            }),
            
            // Colored plastics
            plastic_red: new THREE.MeshStandardMaterial({
                color: 0xff3333,
                metalness: 0.0,
                roughness: 0.7,
            }),
            
            plastic_green: new THREE.MeshStandardMaterial({
                color: 0x33ff33,
                metalness: 0.0,
                roughness: 0.7,
            }),
            
            plastic_blue: new THREE.MeshStandardMaterial({
                color: 0x3333ff,
                metalness: 0.0,
                roughness: 0.7,
            }),
            
            // Glowing/emissive materials
            neon_pink: new THREE.MeshStandardMaterial({
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.5,
                metalness: 0.0,
                roughness: 0.8,
            }),
            
            neon_cyan: new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 0.5,
                metalness: 0.0,
                roughness: 0.8,
            }),
            
            neon_orange: new THREE.MeshStandardMaterial({
                color: 0xff6600,
                emissive: 0xff6600,
                emissiveIntensity: 0.6,
                metalness: 0.0,
                roughness: 0.8,
            }),
            
            // Glass-like materials
            glass: new THREE.MeshStandardMaterial({
                color: 0xaaccff,
                metalness: 0.0,
                roughness: 0.1,
                transparent: true,
                opacity: 0.6,
            }),
            
            // Rubber-like materials
            rubber_black: new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.0,
                roughness: 1.0,
            }),
            
            rubber_yellow: new THREE.MeshStandardMaterial({
                color: 0xffff00,
                metalness: 0.0,
                roughness: 0.9,
            }),
        };

        return materials;
    };

    const materials = createDiverseMaterials();

    // Create terrain using heightfield
    const createTerrain = () => {
        // Create a complex terrain with reasonable parameters to avoid stack overflow
        const terrainSize = 500; // Large but reasonable terrain size
        const terrainResolution = 128; // Moderate resolution for good detail without stack overflow
        
        // Main base terrain with fractal brownian motion for realistic mountain ranges
        const terrain = new Heightfield({
            width: terrainSize,
            depth: terrainSize,
            rows: terrainResolution,
            columns: terrainResolution,
            minElevation: -15,  // Allow valleys and underwater areas
            maxElevation: 60,   // Dramatic mountain peaks
            algorithm: "voronoi",   // Fractal Brownian Motion for realistic terrain
            seed: 42,           // Fixed seed for reproducible terrain
            frequency: 0.015,   // Adjusted frequency for good features at this size
            amplitude: 8,       // Good amplitude for dramatic elevation
            octaves: 6,         // Reasonable octaves for detail without stack overflow
            persistence: 0.6,   // Good persistence for rugged features
            lacunarity: 2.0,    // Standard lacunarity for frequency scaling
            displacementScale: 1, // Good displacement
            smoothing: false,   // Keep sharp features for realism
            uvScale: { x: 4, y: 4 }, // Texture tiling
            material: materials.terrain,
            name: "Complex Terrain"
        });
        
        // Position terrain to accommodate negative elevations
        terrain.setPosition(0, -30, 0);
        terrain.addTag("terrain");
        terrain.addTag("complex-terrain");
        
        // IMPORTANT: Add entity to game world FIRST, then enable physics
        game.createEntity(terrain);
        terrain.enableStaticPhysics(0.9, 0.8); // Higher friction for mountain climbing
        return terrain;
    };

    const terrain = createTerrain();

    // Create diverse dynamic primitives scattered across the terrain
    const createDynamicPrimitives = () => {
        const entities: any[] = [terrain];
        const materialList = Object.values(materials).filter(m => m !== materials.terrain && m !== materials.character);
        
        // Create diverse primitives using available create methods and direct instantiation
        for (let i = 0; i < 45; i++) { // Good number of objects for the terrain
            const material = materialList[Math.floor(Math.random() * materialList.length)];
            const scale = 0.5 + Math.random() * 2.0; // Slightly larger objects
            
            // Spread objects across the terrain
            const x = (Math.random() - 0.5) * 180; // Spread for 200x200 terrain
            const z = (Math.random() - 0.5) * 180;
            const y = 90 + Math.random() * 30; // Start high above the terrain
            
            let primitive;
            const primitiveType = Math.floor(Math.random() * 11);
            
            switch (primitiveType) {
                case 0: // Sphere using game.createSphere
                    primitive = game.createSphere({
                        radius: scale * 0.8,
                        material,
                        name: `Dynamic Sphere ${i}`
                    });
                    break;
                    
                case 1: // Box using game.createBox
                    primitive = game.createBox({
                        size: new THREE.Vector3(scale, scale, scale),
                        material,
                        name: `Dynamic Box ${i}`
                    });
                    break;
                    
                case 2: // Cylinder using direct instantiation
                    primitive = new Cylinder({
                        radiusTop: scale * 0.6, 
                        radiusBottom: scale * 0.8,
                        height: scale * 1.5,
                        material,
                        name: `Dynamic Cylinder ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 3: // Cone using direct instantiation
                    primitive = new Cone({
                        radius: scale * 0.8,
                        height: scale * 1.5,
                        material,
                        name: `Dynamic Cone ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 4: // Torus using direct instantiation
                    primitive = new Torus({
                        radius: scale * 0.8,
                        tube: scale * 0.3,
                        material,
                        name: `Dynamic Torus ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 5: // Capsule using direct instantiation
                    primitive = new Capsule({
                        radius: scale * 0.5,
                        length: scale * 1.5,
                        material,
                        name: `Dynamic Capsule ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 6: // Ring using direct instantiation
                    primitive = new Ring({
                        innerRadius: scale * 0.4,
                        outerRadius: scale * 0.8,
                        material,
                        name: `Dynamic Ring ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 7: // Tetrahedron using direct instantiation
                    primitive = new Tetrahedron({
                        radius: scale,
                        material,
                        name: `Dynamic Tetrahedron ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 8: // Octahedron using direct instantiation
                    primitive = new Octahedron({
                        radius: scale,
                        material,
                        name: `Dynamic Octahedron ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 9: // Dodecahedron using direct instantiation
                    primitive = new Dodecahedron({
                        radius: scale,
                        material,
                        name: `Dynamic Dodecahedron ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                case 10: // Icosahedron using direct instantiation
                    primitive = new Icosahedron({
                        radius: scale,
                        material,
                        name: `Dynamic Icosahedron ${i}`
                    });
                    game.createEntity(primitive);
                    break;
                    
                default:
                    continue;
            }
            
            if (primitive) {
                primitive
                    .setPosition(x, y, z)
                    .setRotation(
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2
                    )
                    .enableDynamicPhysics(
                        0.5 + Math.random() * 2, // mass
                        0.4 + Math.random() * 0.4, // restitution (bounciness)
                        0.3 + Math.random() * 0.4  // friction
                    )
                    .addTag("dynamic")
                    .onClick(() => {
                        // Apply random impulse on click
                        const impulse = new THREE.Vector3(
                            (Math.random() - 0.5) * 30,
                            Math.random() * 20 + 10,
                            (Math.random() - 0.5) * 30
                        );
                        primitive.applyImpulse(impulse);
                        soundManager.play("bounce").catch(console.error);
                    });
                
                entities.push(primitive);
            }
        }
        
        return entities;
    };

    const entities = createDynamicPrimitives();

    // Create the player character  
    const createPlayer = () => {
        const player = new Capsule({
            radius: 0.4,
            length: 1.6,
            name: "Player Character",
            material: materials.character
        });
        
        game.createEntity(player);
        player.setPosition(0, 80, 0); // Start high above the terrain
        player.enableKinematicPhysics(); 
        player.addTag("player");

        return player;
    };

    const player = createPlayer();
    entities.push(player);

    // Setup third person character controller with enhanced jumping capabilities
    const characterConfig: Partial<CharacterControllerConfig> = {
        ...THIRD_PERSON_CHARACTER_CONFIG,
        cameraDistance: -10.0,     // Good camera distance for terrain view
        cameraHeight: 3.5,         // Camera height for terrain
        maxSpeed: 16.0,            // Good movement speed for terrain
        acceleration: 50.0,        // Good acceleration for responsive controls
        jumpForce: 20.0,           // Good jump force for terrain navigation
        sprintMultiplier: 2.0,     // Sprint multiplier for covering terrain
        gravityScale: 20.0,        // Gravity to counteract jump
        maxFallSpeed: -30.0,       // Fall speed for terrain
        snapToGroundDistance: 2, // Ground snapping for uneven terrain
        autoStepIncludeDynamic: true,
        autoStepMinWidth: 0.6,     // Steps for rough terrain
        autoStepMaxHeight: 2.0,    // Step height for terrain climbing
        maxSlopeClimbAngle: Math.PI / 3.8, // Slope climbing (about 47 degrees)
        minSlopeSlideAngle: Math.PI / 4.5,  // Slide control
        offset: 0.02,              // Offset for rough terrain
        cameraSensitivity: 0.0005,  // Camera sensitivity
    };

    const characterController = new CharacterController(
        player,
        cameraManager,
        physicsManager,
        inputManager,
        characterConfig
    );

    characterController.activateCamera();

    // Utility functions
    const explodeAllObjects = () => {
        const dynamicObjects = entities.filter(e => e.hasTag("dynamic"));
        dynamicObjects.forEach(obj => {
            const randomForce = new THREE.Vector3(
                (Math.random() - 0.5) * 80,
                Math.random() * 50 + 30,
                (Math.random() - 0.5) * 80
            );
            obj.applyImpulse(randomForce);
        });
        soundManager.play("bounce").catch(console.error);
    };

    const resetScene = () => {
        // Reset player
        player.setPosition(0, 80, 0); // Start high above the terrain
        player.setVelocity(new THREE.Vector3(0, 0, 0));

        // Reset all dynamic objects
        const dynamicObjects = entities.filter(e => e.hasTag("dynamic"));
        dynamicObjects.forEach((obj, index) => {
            const x = (Math.random() - 0.5) * 180; // Spread for 200x200 terrain
            const z = (Math.random() - 0.5) * 180;
            const y = 90 + Math.random() * 30; // Start high above the terrain
            
            obj.setPosition(x, y, z);
            obj.setVelocity(new THREE.Vector3(0, 0, 0));
            obj.setRotation(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
        });
    };

    const toggleEntityDebugRender = () => {
        const dynamicObjects = entities.filter(e => e.hasTag("dynamic"));
        const firstEntity = dynamicObjects[0];
        if (firstEntity) {
            const currentState = firstEntity.isDebugRenderEnabled();
            dynamicObjects.forEach(entity => {
                if (currentState) {
                    entity.disableDebugRender();
                } else {
                    entity.enableDebugRender();
                }
            });
            console.log(`Entity debug rendering: ${!currentState ? 'ON' : 'OFF'} for ${dynamicObjects.length} entities`);
        }
    };

    const logPhysicsInfo = () => {
        const physicsManager = game.getPhysicsManager();
        const bodyCount = physicsManager.getBodyCount();
        const colliderCount = physicsManager.getColliderCount();
        const debugEnabled = game.isPhysicsDebugRenderEnabled();
        
        console.log('=== Physics Info ===');
        console.log(`Bodies: ${bodyCount}`);
        console.log(`Colliders: ${colliderCount}`);
        console.log(`Debug Rendering: ${debugEnabled ? 'ON' : 'OFF'}`);
        console.log(`Total Entities: ${entities.length}`);
        console.log('==================');
    };

    // Setup input bindings
    const setupInputBindings = () => {
        const bindings: InputBinding[] = [
            {
                id: "explode-objects",
                name: "Explode All Objects",
                inputs: [{ type: "keyboard", key: "KeyE" }],
                callback: explodeAllObjects
            },
            {
                id: "reset-scene",
                name: "Reset Scene",
                inputs: [{ type: "keyboard", key: "KeyR" }],
                callback: resetScene
            },
            {
                id: "toggle-debug-physics",
                name: "Toggle Physics Debug Rendering",
                inputs: [{ type: "keyboard", key: "KeyP" }],
                callback: () => {
                    game.togglePhysicsDebugRender();
                    const enabled = game.isPhysicsDebugRenderEnabled();
                    console.log(`Physics debug rendering: ${enabled ? 'ON' : 'OFF'}`);
                }
            },
            {
                id: "log-physics-info",
                name: "Log Physics Info",
                inputs: [{ type: "keyboard", key: "KeyI" }],
                callback: logPhysicsInfo
            }
        ];

        bindings.forEach(binding => inputManager.addBinding(binding));
    };

    setupInputBindings();

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

    // Create visual status indicator
    const createStatusIndicator = () => {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'debug-status-indicator';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            min-width: 200px;
        `;
        
        const updateStatus = () => {
            const physicsDebug = game.isPhysicsDebugRenderEnabled();
            const bodyCount = game.getPhysicsManager().getBodyCount();
            const colliderCount = game.getPhysicsManager().getColliderCount();
            const dynamicObjects = entities.filter(e => e.hasTag("dynamic"));
            const firstEntity = dynamicObjects[0];
            const entityDebug = firstEntity ? firstEntity.isDebugRenderEnabled() : false;
            
            statusDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">Kitchen Sink v4 Debug Status</div>
                <div>Physics Debug: <span style="color: ${physicsDebug ? '#00ff00' : '#ff0000'}">${physicsDebug ? 'ON' : 'OFF'}</span></div>
                <div>Entity Debug: <span style="color: ${entityDebug ? '#00ff00' : '#ff0000'}">${entityDebug ? 'ON' : 'OFF'}</span></div>
                <div>Bodies: ${bodyCount}</div>
                <div>Colliders: ${colliderCount}</div>
                <div>Dynamic Objects: ${dynamicObjects.length}</div>
                <div style="margin-top: 10px; font-size: 10px;">
                    <div>Press P - Toggle Physics Debug</div>
                    <div>Press D - Toggle Entity Debug</div>
                    <div>Press E - Explode Objects</div>
                    <div>Press R - Reset Scene</div>
                    <div>Press I - Log Physics Info</div>
                </div>
            `;
        };
        
        // Initial update
        updateStatus();
        
        // Append to body
        document.body.appendChild(statusDiv);
        
        return updateStatus;
    };

    const updateStatus = createStatusIndicator();

    // Enhanced animation loop with status updates
    let animationTime = 0;
    let lastStatusUpdate = 0;
    const statusUpdateInterval = 500; // Update status every 500ms
    
    const animateScene = (deltaTime: number) => {
        const currentTime = performance.now();
        animationTime += deltaTime;

        // Update character controller
        characterController.update(deltaTime);

        // Update camera
        cameraManager.update();

        // Update status indicator periodically
        if (currentTime - lastStatusUpdate >= statusUpdateInterval) {
            updateStatus();
            lastStatusUpdate = currentTime;
        }

        // Animate orbital lights
        lights.orbitalLights.forEach((lightData, index) => {
            const time = animationTime * lightData.speed;
            const angle = lightData.baseAngle + time;
            const radius = lightData.baseRadius + Math.sin(time * 1.5) * lightData.radiusVariation;
            const height = lightData.baseHeight + Math.cos(time * 1.2) * lightData.heightVariation;
            
            lightData.light.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            if (lightData.visualSphere) {
                lightData.visualSphere.position.copy(lightData.light.position);
                
                // Animate light intensity for dramatic effect
                const intensityMultiplier = 0.7 + Math.sin(time * 2 + index) * 0.3;
                lightData.light.intensity = 8 * intensityMultiplier;
            }
        });

        // Animate emissive materials
        const emissiveIntensity = 0.4 + Math.sin(animationTime * 3) * 0.3;
        materials.neon_pink.emissiveIntensity = emissiveIntensity;
        materials.neon_cyan.emissiveIntensity = emissiveIntensity;
        materials.neon_orange.emissiveIntensity = emissiveIntensity;
        
        // Animate character material glow
        materials.character.emissiveIntensity = 0.2 + Math.sin(animationTime * 2) * 0.1;
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
        characterController,
        terrain,
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
            explodeAllObjects,
            resetScene,
            toggleEntityDebugRender,
            logPhysicsInfo,
        },
        cleanup: () => {
            // Remove status indicator
            const statusIndicator = document.getElementById('debug-status-indicator');
            if (statusIndicator) {
                document.body.removeChild(statusIndicator);
            }
            
            characterController.dispose();
            inputManager.dispose();
            soundManager.dispose();
            assetManager.dispose();
            game.dispose();
        },
    };
}

// React hook for the new demo
export function useKitchenSinkGameStateV4<T>(
    game: GameWorld,
    selector?: (state: GameState) => T
) {
    if (typeof window === "undefined") {
        throw new Error("useKitchenSinkGameStateV4 can only be used in browser environment");
    }

    const stateHook = createStateHook(game.getStateManager());
    return stateHook(selector);
} 