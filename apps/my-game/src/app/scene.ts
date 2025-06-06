import * as THREE from 'three';
import { Scene, Editable } from '@game.js/core';

export default class HomeScene extends Scene {
  @Editable({ type: 'number', min: 0, max: 20, default: 5, label: 'Camera Y Position' })
  cameraY = 5;

  @Editable({ type: 'number', min: 0, max: 20, default: 10, label: 'Camera Z Position' })
  cameraZ = 10;

  @Editable({ type: 'color', default: '#00ff00', label: 'Cube Color' })
  cubeColor = '#00ff00';

  @Editable({ type: 'number', min: 0.1, max: 3, default: 1, label: 'Cube Scale' })
  cubeScale = 1;

  @Editable({ type: 'number', min: 0, max: 5, default: 1, label: 'Rotation Speed' })
  rotationSpeed = 1;

  private cube: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  async init(): Promise<void> {
    // Load editor overrides from .editor.json if they exist
    await this.loadEditorOverrides();

    console.log('🎮 Scene initialized with properties:');
    console.log('📐 Camera Y Position:', this.cameraY);
    console.log('📐 Camera Z Position:', this.cameraZ);
    console.log('🎨 Cube Color:', this.cubeColor);
    console.log('📏 Cube Scale:', this.cubeScale);
    console.log('🌀 Rotation Speed:', this.rotationSpeed);

    // Setup camera with editable properties
    this.camera.position.set(0, this.cameraY, this.cameraZ);
    this.camera.lookAt(0, 0, 0);

    // Create cube with editable properties
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: this.cubeColor });
    this.cube = new THREE.Mesh(geometry, material);
    this.cube.scale.setScalar(this.cubeScale);
    this.scene.add(this.cube);

    // Register cube for editor access
    this.registerObject('cube', this.cube);

    // Create lights
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);
    this.registerObject('ambientLight', this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(1, 1, 1);
    this.scene.add(this.directionalLight);
    this.registerObject('directionalLight', this.directionalLight);

    console.log('✅ Scene objects registered for editor access');
  }

  private async loadEditorOverrides(): Promise<void> {
    try {
      const response = await fetch('./scene.editor.json');
      if (response.ok) {
        const overrides = await response.json();
        
        // Apply overrides to @Editable properties
        if (overrides.cameraY !== undefined) this.cameraY = overrides.cameraY;
        if (overrides.cameraZ !== undefined) this.cameraZ = overrides.cameraZ;
        if (overrides.cubeColor !== undefined) this.cubeColor = overrides.cubeColor;
        if (overrides.cubeScale !== undefined) this.cubeScale = overrides.cubeScale;
        if (overrides.rotationSpeed !== undefined) this.rotationSpeed = overrides.rotationSpeed;
        
        console.log('📝 Loaded editor overrides:', overrides);
      }
    } catch (error) {
      // No editor overrides file, use defaults
    }
  }

  update(deltaTime: number): void {
    if (this.cube) {
      // Animate cube with editable rotation speed
      this.cube.rotation.x += deltaTime * 0.001 * this.rotationSpeed;
      this.cube.rotation.y += deltaTime * 0.002 * this.rotationSpeed;
      
      // Apply real-time property changes (for editor live updates)
      (this.cube.material as THREE.MeshPhongMaterial).color.setStyle(this.cubeColor);
      this.cube.scale.setScalar(this.cubeScale);
    }

    // Apply camera position changes (for editor live updates)
    this.camera.position.set(0, this.cameraY, this.cameraZ);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
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
    console.log('🎬 Entered home scene');
  }

  onExit(): void {
    console.log('🎬 Exited home scene');
  }
}
