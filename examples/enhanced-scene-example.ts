import * as THREE from 'three';
import { Scene, Editable, RendererManager } from '@game.js/core';

// This shows the enhanced code-first approach that works with your editor
export default class ExampleScene extends Scene {
  // @Editable properties that the editor can modify
  @Editable({ type: 'vector3', default: [0, 5, 10], label: 'Camera Position' })
  cameraPosition = [0, 5, 10];

  @Editable({ type: 'color', default: '#ffffff', label: 'Ambient Light Color' })
  ambientColor = '#ffffff';

  @Editable({ type: 'number', min: 0, max: 2, step: 0.1, default: 0.5, label: 'Ambient Intensity' })
  ambientIntensity = 0.5;

  @Editable({ type: 'color', default: '#00ff00', label: 'Cube Color' })
  cubeColor = '#00ff00';

  // Three.js objects that will be registered for editor access
  private cube: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  async init(): Promise<void> {
    // Setup camera using @Editable property
    this.camera.position.set(...this.cameraPosition as [number, number, number]);
    this.camera.lookAt(0, 0, 0);

    // Create cube and register it for editor access
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: this.cubeColor });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    
    // Register object so editor can manipulate it
    this.registerObject('cube', this.cube);

    // Setup lighting
    this.ambientLight = new THREE.AmbientLight(this.ambientColor, this.ambientIntensity);
    this.scene.add(this.ambientLight);
    this.registerObject('ambientLight', this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(1, 1, 1);
    this.scene.add(this.directionalLight);
    this.registerObject('directionalLight', this.directionalLight);

    // Load editor overrides if they exist
    await this.loadEditorOverrides();
  }

  private async loadEditorOverrides(): Promise<void> {
    try {
      // This would be loaded from scene.editor.json by the Vite plugin
      const response = await fetch('./scene.editor.json');
      if (response.ok) {
        const overrides = await response.json();
        this.setEditorOverrides(overrides);
      }
    } catch (error) {
      // No editor overrides, that's fine
    }
  }

  update(deltaTime: number): void {
    // Animate the cube
    if (this.cube) {
      this.cube.rotation.x += deltaTime * 0.001;
      this.cube.rotation.y += deltaTime * 0.002;
    }

    // Apply any live @Editable property changes
    this.applyEditableChanges();

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private applyEditableChanges(): void {
    // Update camera position
    const [x, y, z] = this.cameraPosition as [number, number, number];
    this.camera.position.set(x, y, z);

    // Update ambient light
    if (this.ambientLight) {
      this.ambientLight.color.setStyle(this.ambientColor);
      this.ambientLight.intensity = this.ambientIntensity;
    }

    // Update cube color
    if (this.cube && this.cube.material instanceof THREE.MeshPhongMaterial) {
      this.cube.material.color.setStyle(this.cubeColor);
    }
  }

  cleanup(): void {
    if (this.cube) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
    }
    
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }

    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }
  }

  onEnter(): void {
    console.log('Entered example scene');
  }

  onExit(): void {
    console.log('Exited example scene');
  }
}

// Example of how the editor would interact with this scene:
class EditorSimulation {
  private scene: ExampleScene;

  constructor(scene: ExampleScene) {
    this.scene = scene;
  }

  // Simulate editor property changes
  simulateEditorChanges(): void {
    setTimeout(() => {
      console.log('=== Simulating Editor Property Changes ===');
      
      // Get all editable properties (editor would show these in property inspector)
      const editableProps = this.scene.getEditableProperties();
      console.log('Editable Properties:', editableProps);

      // Get all registered objects (editor would show these in scene hierarchy)
      const objects = this.scene.getEditableObjects();
      console.log('Scene Objects:', objects);

      // Simulate changing properties from editor UI
      this.scene.setEditorOverrides({
        cameraPosition: [2, 8, 15],
        ambientIntensity: 1.2,
        cubeColor: '#ff0000',
        objects: {
          cube: {
            position: [1, 0, 0],
            rotation: [0.5, 0.5, 0]
          },
          directionalLight: {
            intensity: 2.0,
            position: [2, 2, 2]
          }
        }
      });

      console.log('Applied editor overrides');
    }, 2000);
  }

  // Show how Three.js serialization works
  demonstrateThreeJSSerialization(): void {
    setTimeout(() => {
      console.log('=== Three.js Serialization Demo ===');
      
      // Serialize the entire scene using Three.js's native serialization
      const sceneData = this.scene.serialize();
      console.log('Serialized Scene:', sceneData);

      // This JSON can be saved/loaded by the editor
      // It includes all Three.js objects in their native format
      
    }, 4000);
  }
}

// Usage example:
const rendererManager = RendererManager.getInstance();
const scene = new ExampleScene();

scene.init().then(() => {
  const simulation = new EditorSimulation(scene);
  simulation.simulateEditorChanges();
  simulation.demonstrateThreeJSSerialization();

  // Start the game loop
  let lastTime = 0;
  const animate = (currentTime: number) => {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    scene.update(deltaTime);
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}); 