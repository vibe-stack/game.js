import * as THREE from 'three';
import { Scene, Editable } from '@game.js/core';
import sceneMetadata from './scene.editor.json';

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

  constructor() {
    super();
    // Apply metadata immediately after construction
    this.setMetadata(sceneMetadata);
  }

  async init(): Promise<void> {
    // Log the applied metadata to show how it works
    console.log('🎮 Scene Metadata Applied:', this.metadata);
    console.log('📐 Camera Y Position:', this.cameraY);
    console.log('📐 Camera Z Position:', this.cameraZ);
    console.log('🎨 Cube Color:', this.cubeColor);
    console.log('📏 Cube Scale:', this.cubeScale);
    console.log('🌀 Rotation Speed:', this.rotationSpeed);

    // Apply camera position (these values can be overridden by editor metadata)
    this.camera.position.set(0, this.cameraY, this.cameraZ);
    this.camera.lookAt(0, 0, 0);

    // Create cube with metadata-driven properties
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: this.cubeColor });
    this.cube = new THREE.Mesh(geometry, material);
    this.cube.scale.setScalar(this.cubeScale);
    this.scene.add(this.cube);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Log any additional editor metadata
    if (this.metadata.editorNotes) {
      console.log('📝 Editor Notes:', this.metadata.editorNotes);
    }
    if (this.metadata.lastEditedBy) {
      console.log('👤 Last Edited By:', this.metadata.lastEditedBy);
    }
  }

  update(deltaTime: number): void {
    if (this.cube) {
      // Use metadata-driven rotation speed
      this.cube.rotation.x += deltaTime * 0.001 * this.rotationSpeed;
      this.cube.rotation.y += deltaTime * 0.002 * this.rotationSpeed;
      
      // Apply color and scale changes (useful for hot reloading)
      (this.cube.material as THREE.MeshPhongMaterial).color.setStyle(this.cubeColor);
      this.cube.scale.setScalar(this.cubeScale);
    }

    // Apply camera position changes (useful for hot reloading)
    this.camera.position.y = this.cameraY;
    this.camera.position.z = this.cameraZ;

    this.renderer.render(this.scene, this.camera);
  }

  cleanup(): void {
    if (this.cube) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
    }
  }

  onEnter(): void {
    console.log('Entered home scene');
  }

  onExit(): void {
    console.log('Exited home scene');
  }
}
