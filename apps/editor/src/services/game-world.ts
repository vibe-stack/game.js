import * as THREE from "three/webgpu";
import { SceneData, SceneEntity, Transform } from "@/types/project";

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
      console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${eventListeners.size + 1} ${event} listeners added.`,
      );
    }

    eventListeners.add(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }

    eventListeners.forEach((listener) => {
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
  objectTransformUpdate: { objectId: string; transform: Transform };
  objectUpdate: { objectId: string; updates: Partial<SceneEntity> };
  physicsStep: { deltaTime: number };
  sceneChanged: { scene: SceneData };
}

export class GameWorld extends SimpleEventEmitter {
  private scene: SceneData | null = null;
  private objects: Map<string, SceneEntity> = new Map();
  private transforms: Map<string, Transform> = new Map();
  private originalTransforms: Map<string, Transform> = new Map(); // Store original transforms for reset
  private liveTransforms: Map<string, THREE.Matrix4> = new Map();
  private sceneSnapshot: SceneData | null = null; // Full scene snapshot
  private physicsWorld: any = null;
  private transformSnapshot: Map<string, Transform> | null = null; // Entity transform snapshot
  private rigidBodies: Map<string, any> = new Map();
  private _isRunning = false;
  private lastUpdateTime = 0;
  private updateCallbacks: Set<(deltaTime: number) => void> = new Set();
  private threeScene: THREE.Scene | null = null;
  private threeObjects: Map<string, THREE.Object3D> = new Map();
  private manipulatingObjects: Set<string> = new Set(); // Track which objects are being manipulated

  // Three.js viewport references
  private threeRenderer: THREE.WebGPURenderer | null = null;
  private threeCamera: THREE.Camera | null = null;

  constructor() {
    super();
    this.setMaxListeners(100); // Increase limit for editor usage
  }

  // Scene Management
  loadScene(scene: SceneData): void {
    // Clear existing scene data to prevent duplication
    this.objects.clear();
    this.transforms.clear();
    this.originalTransforms.clear();
    this.liveTransforms.clear();
    this.rigidBodies.clear();
    this.threeObjects.clear();
    
    this.scene = { ...scene };
    this.buildObjectMap(scene.entities);
  }

  private buildObjectMap(
    entities: SceneEntity[],
    parentTransform = new THREE.Matrix4(),
  ): void {
    for (const entity of entities) {
      this.objects.set(entity.id, entity);
      this.transforms.set(entity.id, { ...entity.transform });
      this.originalTransforms.set(entity.id, { ...entity.transform }); // Store original transform

      const localMatrix = new THREE.Matrix4();
      const { position, rotation, scale } = entity.transform;

      const rotQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ"),
      );
      localMatrix.compose(
        new THREE.Vector3(position.x, position.y, position.z),
        rotQuat,
        new THREE.Vector3(scale.x, scale.y, scale.z),
      );

      const worldMatrix = new THREE.Matrix4().multiplyMatrices(
        parentTransform,
        localMatrix,
      );
      this.liveTransforms.set(entity.id, worldMatrix.clone());

      if (entity.children && entity.children.length > 0) {
        this.buildObjectMap(entity.children, worldMatrix);
      }
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

  // Three.js viewport integration
  setThreeRenderer(renderer: THREE.WebGPURenderer): void {
    this.threeRenderer = renderer;
  }

  setThreeCamera(camera: THREE.Camera): void {
    this.threeCamera = camera;
  }

  getThreeScene(): THREE.Scene | null {
    return this.threeScene;
  }

  getThreeRenderer(): THREE.WebGPURenderer | null {
    return this.threeRenderer;
  }

  getThreeCamera(): THREE.Camera | null {
    return this.threeCamera;
  }

  // Object Management
  getObject(objectId: string): SceneEntity | null {
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

    (obj as any)[property] = value;

    const threeObj = this.threeObjects.get(objectId);
    if (threeObj) {
      if (property === "visible") threeObj.visible = value;
      else if (property === "name") threeObj.name = value;
    }

    this.emit("objectUpdate", { objectId, updates: { [property]: value } });
  }

  updateObjectTransform(objectId: string, transform: Partial<Transform>): void {
    const currentTransform = this.transforms.get(objectId);
    if (!currentTransform) return;

    if (this._isRunning && this.rigidBodies.has(objectId)) {
      console.warn(
        `Cannot directly update transform of physics object ${objectId} while simulation is running.`,
      );
      return;
    }

    const newTransform = { ...currentTransform, ...transform };
    this.transforms.set(objectId, newTransform);

    // CRITICAL FIX: When physics is stopped, any editor transforms should become the new "original" state
    // This prevents the system from reverting to old snapshot data when objects are moved during stopped physics
    if (!this._isRunning) {
      this.originalTransforms.set(objectId, { ...newTransform });

      // Also update the scene snapshot if it exists to reflect the new state
      if (this.sceneSnapshot) {
        const updateSnapshotTransforms = (entities: SceneEntity[]) => {
          entities.forEach((entity) => {
            if (entity.id === objectId) {
              entity.transform = { ...newTransform };
            }
            if (entity.children && entity.children.length > 0) {
              updateSnapshotTransforms(entity.children);
            }
          });
        };
        updateSnapshotTransforms(this.sceneSnapshot.entities);
      }
    }

    // PERFORMANCE FIX: Only rebuild specific object transform hierarchies instead of entire scene
    // This prevents conflicts when multiple scripts update transforms in the same frame
    this.updateObjectHierarchy(objectId, newTransform);

    const threeObj = this.threeObjects.get(objectId);
    if (threeObj) {
      const { position, rotation, scale } = newTransform;
      threeObj.position.set(position.x, position.y, position.z);
      threeObj.rotation.set(rotation.x, rotation.y, rotation.z);
      threeObj.scale.set(scale.x, scale.y, scale.z);
    }

    const obj = this.objects.get(objectId);
    if (obj) obj.transform = newTransform;
    this.emit("objectTransformUpdate", { objectId, transform: newTransform });
  }

  // NEW: Efficient update of specific object hierarchy instead of rebuilding entire scene
  private updateObjectHierarchy(objectId: string, newTransform: Transform): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;

    // Calculate local matrix for this object
    const localMatrix = new THREE.Matrix4();
    const { position, rotation, scale } = newTransform;
    const rotQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ"),
    );
    localMatrix.compose(
      new THREE.Vector3(position.x, position.y, position.z),
      rotQuat,
      new THREE.Vector3(scale.x, scale.y, scale.z),
    );

    // Find parent transform or use identity
    let parentMatrix = new THREE.Matrix4(); // Identity matrix
    const parentId = this.findParentId(objectId);
    if (parentId) {
      const parentWorldMatrix = this.liveTransforms.get(parentId);
      if (parentWorldMatrix) {
        parentMatrix = parentWorldMatrix.clone();
      }
    }

    // Calculate world matrix for this object
    const worldMatrix = new THREE.Matrix4().multiplyMatrices(parentMatrix, localMatrix);
    this.liveTransforms.set(objectId, worldMatrix);

    // Recursively update children with new parent matrix
    this.updateChildrenTransforms(obj, worldMatrix);
  }

  // Helper to find parent object ID
  private findParentId(objectId: string): string | null {
    if (!this.scene) return null;
    
    const findInObjects = (entities: SceneEntity[], parent: SceneEntity | null = null): string | null => {
      for (const entity of entities) {
        if (entity.id === objectId) {
          return parent?.id || null;
        }
        if (entity.children && entity.children.length > 0) {
          const result = findInObjects(entity.children, entity);
          if (result !== null) return result;
        }
      }
      return null;
    };

    return findInObjects(this.scene.entities);
  }

  // Helper to update children transforms recursively
  private updateChildrenTransforms(parentEntity: SceneEntity, parentWorldMatrix: THREE.Matrix4): void {
    if (!parentEntity.children || parentEntity.children.length === 0) return;

    for (const child of parentEntity.children) {
      const childTransform = this.transforms.get(child.id);
      if (!childTransform) continue;

      const { position, rotation, scale } = childTransform;
      const localMatrix = new THREE.Matrix4();
      const rotQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ"),
      );
      localMatrix.compose(
        new THREE.Vector3(position.x, position.y, position.z),
        rotQuat,
        new THREE.Vector3(scale.x, scale.y, scale.z),
      );

      const childWorldMatrix = new THREE.Matrix4().multiplyMatrices(parentWorldMatrix, localMatrix);
      this.liveTransforms.set(child.id, childWorldMatrix);

      // Recursively update grandchildren
      this.updateChildrenTransforms(child, childWorldMatrix);
    }
  }

  updateObjectComponent(
    objectId: string,
    property: string,
    updates: any,
  ): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;

    // Update entity properties
    if (!obj.properties) obj.properties = {};
    obj.properties[property] = updates;

    this.emit("objectUpdate", {
      objectId,
      updates: { properties: obj.properties },
    });
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
  applyForce(objectId: string, force: { x: number; y: number; z: number }, point?: { x: number; y: number; z: number }): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    if (point) rigidBody.applyForceAtPoint(force, point, true);
    else rigidBody.applyForce(force, true);
  }

  applyImpulse(objectId: string, impulse: { x: number; y: number; z: number }, point?: { x: number; y: number; z: number }): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    if (point) rigidBody.applyImpulseAtPoint(impulse, point, true);
    else rigidBody.applyImpulse(impulse, true);
  }

  setVelocity(objectId: string, velocity: { x: number; y: number; z: number }): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    rigidBody.setLinvel(velocity, true);
  }

  setAngularVelocity(objectId: string, angularVelocity: { x: number; y: number; z: number }): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    rigidBody.setAngvel(angularVelocity, true);
  }

  getVelocity(objectId: string): { x: number; y: number; z: number } | null {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return null;
    const v = rigidBody.linvel();
    return { x: v.x, y: v.y, z: v.z };
  }

  getAngularVelocity(objectId: string): { x: number; y: number; z: number } | null {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return null;
    const av = rigidBody.angvel();
    return { x: av.x, y: av.y, z: av.z };
  }

  // Game Loop
  start(): void {
    if (this._isRunning) return;
    
    // Take snapshots before starting
    this.takeSnapshots();
    
    this._isRunning = true;
    this.lastUpdateTime = performance.now();
  }

  stop(): void {
    this._isRunning = false;
    
    // Restore from snapshots
    this.restoreSnapshots();
  }

  private takeSnapshots(): void {
    // Take transform snapshot
    this.transformSnapshot = new Map();
    this.transforms.forEach((transform, objectId) => {
      this.transformSnapshot!.set(objectId, {
        position: { ...transform.position },
        rotation: { ...transform.rotation },
        scale: { ...transform.scale }
      });
    });
    
  }

  private restoreSnapshots(): void {
    let transformsRestored = false;
    
    // Restore transforms
    if (this.transformSnapshot) {
      this.transformSnapshot.forEach((snapshotTransform, objectId) => {
        // Update the transform in our maps
        this.transforms.set(objectId, {
          position: { ...snapshotTransform.position },
          rotation: { ...snapshotTransform.rotation },
          scale: { ...snapshotTransform.scale }
        });
        
        // Update Three.js object if it exists
        const threeObj = this.threeObjects.get(objectId);
        if (threeObj) {
          const { position, rotation, scale } = snapshotTransform;
          threeObj.position.set(position.x, position.y, position.z);
          threeObj.rotation.set(rotation.x, rotation.y, rotation.z);
          threeObj.scale.set(scale.x, scale.y, scale.z);
        }
        
        // Reset physics body if it exists (manual reset, not snapshot)
        const rigidBody = this.rigidBodies.get(objectId);
        if (rigidBody) {
          try {
            const { position, rotation } = snapshotTransform;
            rigidBody.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
            rigidBody.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: 1 }, true);
            // Reset velocities to zero
            rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
            // Wake up the body
            rigidBody.wakeUp();
          } catch (error) {
            console.error(`Failed to reset rigid body for object ${objectId}:`, error);
          }
        }
        
        // Emit update event
        this.emit("objectTransformUpdate", { objectId, transform: snapshotTransform });
        transformsRestored = true;
      });
    }
    
    // Clear snapshots after use
    this.transformSnapshot = null;
    
    // Emit reset event to notify UI components
    this.emit("physicsReset");
    
    // Update scene to reflect restored state
    if (transformsRestored && this.scene) {
      this.emit("sceneChanged", { scene: this.scene });
    }
    
  }

  pause(): void {
    this._isRunning = false;
  }

  resume(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.lastUpdateTime = performance.now();
  }

  // Scene Snapshot Management (fallback)
  createSceneSnapshot(): void {
    if (!this.scene) return;

    // Create a deep copy of the scene, but ensure we capture the original transforms
    // not any runtime modifications that may have occurred
    const sceneWithOriginalTransforms = JSON.parse(JSON.stringify(this.scene));

    // Recursively restore original transforms in the snapshot
    const restoreOriginalTransforms = (entities: SceneEntity[]) => {
      entities.forEach((entity) => {
        const originalTransform = this.originalTransforms.get(entity.id);
        if (originalTransform) {
          entity.transform = { ...originalTransform };
        }
        if (entity.children && entity.children.length > 0) {
          restoreOriginalTransforms(entity.children);
        }
      });
    };

    restoreOriginalTransforms(sceneWithOriginalTransforms.entities);
    this.sceneSnapshot = sceneWithOriginalTransforms;
  }

  restoreSceneSnapshot(): void {
    if (!this.sceneSnapshot) {
      console.warn("No scene snapshot to restore.");
      return;
    }

    // 1. Restore the scene data model.
    this.scene = JSON.parse(JSON.stringify(this.sceneSnapshot));

    // 2. Rebuild data maps from the restored scene data, preserving physics/visual object maps.
    this.objects.clear();
    this.transforms.clear();
    this.liveTransforms.clear();

    if (this.scene) {
      // This correctly calculates the initial world matrices for all objects
      // based on the snapshot data and stores them in `this.liveTransforms`.
      this.buildObjectMap(this.scene.entities);
    }

    // 3. CRITICAL FIX: Synchronize originalTransforms with the restored state
    // This ensures that the restored state becomes the new baseline for any subsequent manual edits during stopped physics
    this.objects.forEach((entity, objectId) => {
      this.originalTransforms.set(objectId, { ...entity.transform });
    });

    // 4. Iterate over all objects and imperatively reset their states.
    this.objects.forEach((entity, objectId) => {
      const { transform } = entity;

      // The useFrame loop in SceneObjectNew will handle the visual update
      // by reading from the now-restored transforms map.

      // Restore the physics rigid body, if it exists.
      const rigidBody = this.rigidBodies.get(objectId);
      if (rigidBody) {
        // Get the world matrix calculated by `buildObjectMap`.
        const worldMatrix = this.liveTransforms.get(objectId);
        if (worldMatrix) {
          const worldPosition = new THREE.Vector3();
          const worldQuaternion = new THREE.Quaternion();
          const worldScale = new THREE.Vector3(); // Not used for physics body
          worldMatrix.decompose(worldPosition, worldQuaternion, worldScale);

          try {
            // Apply the WORLD position and rotation to the physics body.
            rigidBody.setTranslation(worldPosition, true);
            rigidBody.setRotation(worldQuaternion, true);

            // CRITICAL: Reset all motion to zero.
            rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

            rigidBody.wakeUp();
          } catch (error) {
            console.error(
              `Failed to reset rigid body for object ${objectId}:`,
              error,
            );
          }
        } else {
          console.warn(
            `Could not find world matrix for object ${objectId} on restore.`,
          );
        }
      }

      // Emit an update for the UI (like the inspector) to refresh with restored local transform.
      this.emit("objectTransformUpdate", { objectId, transform });
    });
    // This will trigger a re-render for UI consistency.
    if (this.scene) {
      this.emit("sceneChanged", { scene: this.scene });
    }
  }

  private updateTransformsFromPhysics(): void {
    // Update transforms based on current physics state
    this.rigidBodies.forEach((rigidBody, objectId) => {
      if (!rigidBody?.translation || !rigidBody?.rotation) return;

      const position = rigidBody.translation();
      const rotation = rigidBody.rotation();

      // Update the transform in our maps
      const transform = this.transforms.get(objectId);
      if (transform) {
        transform.position = { x: position.x, y: position.y, z: position.z };
        const euler = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
        );
        transform.rotation = { x: euler.x, y: euler.y, z: euler.z };
        
        // Emit update event
        this.emit("objectTransformUpdate", { objectId, transform });
      }

      // Update Three.js object if it exists
      const threeObj = this.threeObjects.get(objectId);
      if (threeObj) {
        threeObj.position.set(position.x, position.y, position.z);
        threeObj.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    });
  }

  update(currentTime: number): void {
    if (!this._isRunning) return;

    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    this.updatePhysicsTransforms();
    this.updateCallbacks.forEach((callback) => callback(deltaTime));
    this.emit("physicsStep", { deltaTime });
  }

  private updatePhysicsTransforms(): void {
    this.rigidBodies.forEach((rigidBody, objectId) => {
      if (!rigidBody?.isDynamic() || !rigidBody.translation) return;

      const position = rigidBody.translation();
      const rotation = rigidBody.rotation();

      const threeObj = this.threeObjects.get(objectId);
      if (threeObj) {
        threeObj.position.set(position.x, position.y, position.z);
        threeObj.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }

      const transform = this.transforms.get(objectId);
      if (transform) {
        transform.position = { x: position.x, y: position.y, z: position.z };
        const euler = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
        );
        transform.rotation = { x: euler.x, y: euler.y, z: euler.z };
      }
    });
  }

  addUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.add(callback);
  }
  removeUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.delete(callback);
  }
  getSelectedObjectData(objectId: string): SceneEntity | null {
    return this.objects.get(objectId) || null;
  }
  getAllObjects(): SceneEntity[] {
    return this.scene ? this.scene.entities : [];
  }
  findObjectById(objectId: string): SceneEntity | null {
    return this.objects.get(objectId) || null;
  }
  findObjectsByTag(tag: string): SceneEntity[] {
    return Array.from(this.objects.values()).filter((entity) =>
      entity.tags?.includes(tag),
    );
  }
  findObjectsByComponent(type: string): SceneEntity[] {
    return Array.from(this.objects.values()).filter((entity) =>
      entity.type === type,
    );
  }
  isRunning(): boolean {
    return this._isRunning;
  }
  getScene(): SceneData | null {
    return this.scene;
  }

  dispose(): void {
    this.stop();
    this.objects.clear();
    this.transforms.clear();
    this.originalTransforms.clear();
    this.liveTransforms.clear();
    this.sceneSnapshot = null;
    this.transformSnapshot = null;
    this.rigidBodies.clear();
    this.threeObjects.clear();
    this.updateCallbacks.clear();
    this.removeAllListeners();
  }

  // Manipulation tracking methods
  startManipulating(objectId: string): void {
    this.manipulatingObjects.add(objectId);
  }

  stopManipulating(objectId: string): void {
    this.manipulatingObjects.delete(objectId);
  }

  isManipulating(objectId: string): boolean {
    return this.manipulatingObjects.has(objectId);
  }
}

// Singleton instance for the editor
export const gameWorld = new GameWorld();
