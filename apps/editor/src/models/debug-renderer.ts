import * as THREE from "three/webgpu";
import { PhysicsManager } from "./physics-manager";

export class DebugRenderer {
  private linesMaterial: THREE.LineBasicMaterial;
  private linesGeometry: THREE.BufferGeometry;
  private linesObject: THREE.LineSegments;
  private scene: THREE.Scene;
  private physicsManager: PhysicsManager;
  private enabled = false;
  private positionAttribute: THREE.BufferAttribute | null = null;
  private colorAttribute: THREE.BufferAttribute | null = null;
  private lastVertexCount = 0;

  constructor(scene: THREE.Scene, physicsManager: PhysicsManager) {
    this.scene = scene;
    this.physicsManager = physicsManager;

    // Create material for debug lines
    this.linesMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    // Create geometry for debug lines
    this.linesGeometry = new THREE.BufferGeometry();
    
    // Create the line segments object
    this.linesObject = new THREE.LineSegments(this.linesGeometry, this.linesMaterial);
    this.linesObject.name = "PhysicsDebugRenderer";
    
    // Initially hidden
    this.linesObject.visible = false;
  }

  enable(): void {
    if (!this.enabled) {
      this.enabled = true;
      this.physicsManager.enableDebugRender(true);
      this.scene.add(this.linesObject);
      this.linesObject.visible = true;
      
      // Initialize buffer attributes on first enable
      this.initializeBuffers();
      
      // Force an immediate update to sync with current physics state
      this.update();
    }
  }

  disable(): void {
    if (this.enabled) {
      this.enabled = false;
      this.physicsManager.enableDebugRender(false);
      this.linesObject.visible = false;
      this.scene.remove(this.linesObject);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  private initializeBuffers(): void {
    // Get initial debug data to set up buffers
    const debugData = this.physicsManager.getDebugRenderData();
    if (!debugData) {
      console.warn("No debug data available for initialization");
      return;
    }

    const { vertices, colors } = debugData;

    // Create buffer attributes
    this.positionAttribute = new THREE.BufferAttribute(vertices, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 4);

    this.linesGeometry.setAttribute('position', this.positionAttribute);
    this.linesGeometry.setAttribute('color', this.colorAttribute);
    
    this.lastVertexCount = vertices.length;
  }

  update(): void {
    if (!this.enabled) return;

    const debugData = this.physicsManager.getDebugRenderData();
    if (!debugData) return;

    const { vertices, colors } = debugData;

    // Log if vertex count changed (indicates dynamic updates)
    if (vertices.length !== this.lastVertexCount) {
      this.lastVertexCount = vertices.length;
    }

    // Check if we need to recreate buffers (size changed)
    const needsRecreate = !this.positionAttribute || 
                         this.positionAttribute.array.length !== vertices.length ||
                         !this.colorAttribute ||
                         this.colorAttribute.array.length !== colors.length;

    if (needsRecreate) {
      
      // Recreate buffer attributes with new size
      this.positionAttribute = new THREE.BufferAttribute(vertices, 3);
      this.colorAttribute = new THREE.BufferAttribute(colors, 4);
      
      this.linesGeometry.setAttribute('position', this.positionAttribute);
      this.linesGeometry.setAttribute('color', this.colorAttribute);
      
      // Update geometry bounds
      this.linesGeometry.computeBoundingBox();
      this.linesGeometry.computeBoundingSphere();
    } else {
      // Update existing buffer attributes efficiently
      if (this.positionAttribute && this.colorAttribute) {
        // Copy new data to existing arrays
        this.positionAttribute.array.set(vertices);
        this.colorAttribute.array.set(colors);
        
        // Mark for update
        this.positionAttribute.needsUpdate = true;
        this.colorAttribute.needsUpdate = true;
        
        // Update geometry bounds for proper culling/rendering
        this.linesGeometry.computeBoundingBox();
        this.linesGeometry.computeBoundingSphere();
      }
    }
  }

  dispose(): void {
    this.disable();
    this.linesGeometry.dispose();
    this.linesMaterial.dispose();
  }
} 