import * as THREE from 'three';

// Simple browser-compatible EventEmitter implementation
type EventListener = (...args: any[]) => void;

class SimpleEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private maxListeners = 10;

  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  on(event: string, listener: EventListener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const eventListeners = this.listeners.get(event)!;
    
    if (eventListeners.size >= this.maxListeners) {
      console.warn(`MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${eventListeners.size + 1} ${event} listeners added.`);
    }
    
    eventListeners.add(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }

    eventListeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });

    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  off(event: string, listener: EventListener): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  removeListener(event: string, listener: EventListener): this {
    return this.off(event, listener);
  }
}

export interface GameWorldEvent {
  'objectTransformUpdate': { objectId: string; transform: Transform };
  'objectUpdate': { objectId: string; updates: Partial<GameObject> };
  'physicsStep': { deltaTime: number };
  'sceneChanged': { scene: GameScene };
}

export class GameWorld extends SimpleEventEmitter {
  private scene: GameScene | null = null;
  private objects: Map<string, GameObject> = new Map();
  private transforms: Map<string, Transform> = new Map();
  private liveTransforms: Map<string, THREE.Matrix4> = new Map();
  private originalTransforms: Map<string, Transform> = new Map(); // Store original transforms before physics
  private physicsWorld: any = null;
  private rigidBodies: Map<string, any> = new Map();
  private _isRunning = false;
  private lastUpdateTime = 0;
  private updateCallbacks: Set<(deltaTime: number) => void> = new Set();
  private threeScene: THREE.Scene | null = null;
  private threeObjects: Map<string, THREE.Object3D> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100); // Increase limit for editor usage
  }

  // Scene Management
  loadScene(scene: GameScene): void {
    this.scene = scene;
    this.objects.clear();
    this.transforms.clear();
    this.liveTransforms.clear();
    this.threeObjects.clear();
    
    // Build object map and initial transforms
    this.buildObjectMap(scene.objects);
    
    this.emit('sceneChanged', { scene });
  }

  private buildObjectMap(objects: GameObject[], parentTransform?: THREE.Matrix4): void {
    for (const obj of objects) {
      this.objects.set(obj.id, obj);
      this.transforms.set(obj.id, { ...obj.transform });
      
      // Calculate world transform
      const localMatrix = new THREE.Matrix4();
      const { position, rotation, scale } = obj.transform;
      
      localMatrix.makeTranslation(position.x, position.y, position.z);
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
      localMatrix.multiply(rotationMatrix);
      
      const scaleMatrix = new THREE.Matrix4();
      scaleMatrix.makeScale(scale.x, scale.y, scale.z);
      localMatrix.multiply(scaleMatrix);
      
      const worldMatrix = parentTransform 
        ? new THREE.Matrix4().multiplyMatrices(parentTransform, localMatrix)
        : localMatrix;
      
      this.liveTransforms.set(obj.id, worldMatrix.clone());
      
      // Process children
      this.buildObjectMap(obj.children, worldMatrix);
    }
  }

  // Three.js Scene Integration
  setThreeScene(scene: THREE.Scene): void {
    this.threeScene = scene;
  }

  registerThreeObject(objectId: string, object: THREE.Object3D): void {
    this.threeObjects.set(objectId, object);
    object.userData.objectId = objectId;
  }

  unregisterThreeObject(objectId: string): void {
    this.threeObjects.delete(objectId);
  }

  // Object Management
  getObject(objectId: string): GameObject | null {
    return this.objects.get(objectId) || null;
  }

  getObjectTransform(objectId: string): Transform | null {
    return this.transforms.get(objectId) || null;
  }

  getLiveTransform(objectId: string): THREE.Matrix4 | null {
    return this.liveTransforms.get(objectId) || null;
  }

  updateObjectProperty(objectId: string, property: string, value: any): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;

    // Update the object
    (obj as any)[property] = value;
    
    // Update the Three.js object if it exists
    const threeObj = this.threeObjects.get(objectId);
    if (threeObj) {
      // Apply property updates to Three.js object
      if (property === 'visible') {
        threeObj.visible = value;
      } else if (property === 'name') {
        threeObj.name = value;
      }
    }

    this.emit('objectUpdate', { objectId, updates: { [property]: value } });
  }

  updateObjectTransform(objectId: string, transform: Partial<Transform>): void {
    const currentTransform = this.transforms.get(objectId);
    if (!currentTransform) return;

    // Prevent direct transform updates on physics objects
    if (this.rigidBodies.has(objectId)) {
      console.warn(`Cannot directly update transform of physics object ${objectId}. Use physics forces/impulses instead.`);
      return;
    }

    const newTransform = { ...currentTransform, ...transform };
    this.transforms.set(objectId, newTransform);

    // Update live transform matrix
    const matrix = new THREE.Matrix4();
    const { position, rotation, scale } = newTransform;
    
    matrix.makeTranslation(position.x, position.y, position.z);
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
    matrix.multiply(rotationMatrix);
    
    const scaleMatrix = new THREE.Matrix4();
    scaleMatrix.makeScale(scale.x, scale.y, scale.z);
    matrix.multiply(scaleMatrix);
    
    this.liveTransforms.set(objectId, matrix);

    // Update the Three.js object immediately (this fixes the visual update issue)
    const threeObj = this.threeObjects.get(objectId);
    
    if (threeObj) {
      // Always update the Three.js object for immediate visual feedback
      threeObj.position.set(position.x, position.y, position.z);
      threeObj.rotation.set(rotation.x, rotation.y, rotation.z);
      threeObj.scale.set(scale.x, scale.y, scale.z);
    }

    // Update the GameObject for consistency
    const obj = this.objects.get(objectId);
    if (obj) {
      obj.transform = newTransform;
    }

    this.emit('objectTransformUpdate', { objectId, transform: newTransform });
  }

  updateObjectComponent(objectId: string, componentId: string, updates: Partial<GameObjectComponent>): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;

    const component = obj.components.find(c => c.id === componentId);
    if (!component) return;

    Object.assign(component, updates);
    
    // Emit update for UI synchronization
    this.emit('objectUpdate', { objectId, updates: { components: obj.components } });
  }

  // Physics Integration
  setPhysicsWorld(world: any): void {
    this.physicsWorld = world;
  }

  registerRigidBody(objectId: string, rigidBody: any): void {
    this.rigidBodies.set(objectId, rigidBody);
  }

  unregisterRigidBody(objectId: string): void {
    this.rigidBodies.delete(objectId);
  }

  // Physics Control Methods
  applyForce(objectId: string, force: Vector3, point?: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) {
      console.warn(`No rigid body found for object ${objectId}`);
      return;
    }

    if (point) {
      // Apply force at specific point
      rigidBody.applyForceAtPoint(force, point, true);
    } else {
      // Apply force at center of mass
      rigidBody.applyForce(force, true);
    }
  }

  applyImpulse(objectId: string, impulse: Vector3, point?: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) {
      console.warn(`No rigid body found for object ${objectId}`);
      return;
    }

    if (point) {
      // Apply impulse at specific point
      rigidBody.applyImpulseAtPoint(impulse, point, true);
    } else {
      // Apply impulse at center of mass
      rigidBody.applyImpulse(impulse, true);
    }
  }

  setVelocity(objectId: string, velocity: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) {
      console.warn(`No rigid body found for object ${objectId}`);
      return;
    }

    rigidBody.setLinvel(velocity, true);
  }

  setAngularVelocity(objectId: string, angularVelocity: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) {
      console.warn(`No rigid body found for object ${objectId}`);
      return;
    }

    rigidBody.setAngvel(angularVelocity, true);
  }

  getVelocity(objectId: string): Vector3 | null {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return null;

    const velocity = rigidBody.linvel();
    return { x: velocity.x, y: velocity.y, z: velocity.z };
  }

  getAngularVelocity(objectId: string): Vector3 | null {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return null;

    const angularVelocity = rigidBody.angvel();
    return { x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z };
  }

  // Game Loop
  start(): void {
    this._isRunning = true;
    this.lastUpdateTime = performance.now();
    
    // Save original transforms before physics starts
    this.saveOriginalTransforms();
  }

  stop(): void {
    this._isRunning = false;
    
    // Restore original transforms when stopping physics
    this.restoreOriginalTransforms();
  }

  pause(): void {
    this._isRunning = false;
  }

  resume(): void {
    this._isRunning = true;
    this.lastUpdateTime = performance.now();
  }

  private saveOriginalTransforms(): void {
    this.originalTransforms.clear();
    this.transforms.forEach((transform, objectId) => {
      this.originalTransforms.set(objectId, { ...transform });
    });
  }

  private restoreOriginalTransforms(): void {
    this.originalTransforms.forEach((originalTransform, objectId) => {
      // Restore the transform in our internal state
      this.transforms.set(objectId, { ...originalTransform });
      
      // Update the GameObject as well
      const obj = this.objects.get(objectId);
      if (obj) {
        obj.transform = { ...originalTransform };
      }
      
      // Update the live transform matrix
      const matrix = new THREE.Matrix4();
      const { position, rotation, scale } = originalTransform;
      
      matrix.makeTranslation(position.x, position.y, position.z);
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
      matrix.multiply(rotationMatrix);
      
      const scaleMatrix = new THREE.Matrix4();
      scaleMatrix.makeScale(scale.x, scale.y, scale.z);
      matrix.multiply(scaleMatrix);
      
      this.liveTransforms.set(objectId, matrix);
      
      // Update the Three.js object immediately (bypass physics)
      const threeObj = this.threeObjects.get(objectId);
      if (threeObj) {
        threeObj.position.set(position.x, position.y, position.z);
        threeObj.rotation.set(rotation.x, rotation.y, rotation.z);
        threeObj.scale.set(scale.x, scale.y, scale.z);
      }
      
      // Emit update for UI synchronization
      this.emit('objectTransformUpdate', { objectId, transform: originalTransform });
    });
  }

  update(currentTime: number): void {
    if (!this._isRunning) return;

    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    // Update physics-controlled transforms from rigid bodies
    this.updatePhysicsTransforms();

    // Execute update callbacks (scripts, etc.)
    this.updateCallbacks.forEach(callback => callback(deltaTime));

    this.emit('physicsStep', { deltaTime });
  }

  private updatePhysicsTransforms(): void {
    // Update transforms from physics rigid bodies
    this.rigidBodies.forEach((rigidBody, objectId) => {
      if (!rigidBody || !rigidBody.translation || !rigidBody.rotation) return;

      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();

      // Update live transform matrix
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(translation.x, translation.y, translation.z);
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
      const scale = new THREE.Vector3(1, 1, 1); // Physics doesn't typically modify scale
      
      matrix.compose(position, quaternion, scale);
      this.liveTransforms.set(objectId, matrix);

      // Update the corresponding Three.js object
      const threeObj = this.threeObjects.get(objectId);
      if (threeObj) {
        threeObj.position.copy(position);
        threeObj.quaternion.copy(quaternion);
        // Don't update scale from physics
      }

      // Update internal transform for consistency (convert quaternion to euler)
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      const transform = this.transforms.get(objectId);
      if (transform) {
        transform.position = { x: translation.x, y: translation.y, z: translation.z };
        transform.rotation = { x: euler.x, y: euler.y, z: euler.z };
        // Scale remains unchanged by physics
      }
    });
  }

  // Update Callbacks (for scripts, etc.)
  addUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.add(callback);
  }

  removeUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.delete(callback);
  }

  // Data Access for UI
  getSelectedObjectData(objectId: string): GameObject | null {
    return this.objects.get(objectId) || null;
  }

  getAllObjects(): GameObject[] {
    if (!this.scene) return [];
    return this.scene.objects;
  }

  // Scene queries
  findObjectById(objectId: string): GameObject | null {
    return this.objects.get(objectId) || null;
  }

  findObjectsByTag(tag: string): GameObject[] {
    const results: GameObject[] = [];
    this.objects.forEach(obj => {
      if (obj.tags && obj.tags.includes(tag)) {
        results.push(obj);
      }
    });
    return results;
  }

  findObjectsByComponent(componentType: string): GameObject[] {
    const results: GameObject[] = [];
    this.objects.forEach(obj => {
      if (obj.components.some(comp => comp.type === componentType)) {
        results.push(obj);
      }
    });
    return results;
  }

  // Utility
  isRunning(): boolean {
    return this._isRunning;
  }

  getScene(): GameScene | null {
    return this.scene;
  }

  // Cleanup
  dispose(): void {
    this._isRunning = false;
    this.objects.clear();
    this.transforms.clear();
    this.liveTransforms.clear();
    this.originalTransforms.clear();
    this.rigidBodies.clear();
    this.threeObjects.clear();
    this.updateCallbacks.clear();
    this.removeAllListeners();
  }
}

// Singleton instance for the editor
export const gameWorld = new GameWorld(); 