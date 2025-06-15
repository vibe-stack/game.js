import * as THREE from "three";

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
  objectUpdate: { objectId: string; updates: Partial<GameObject> };
  physicsStep: { deltaTime: number };
  sceneChanged: { scene: GameScene };
}

export class GameWorld extends SimpleEventEmitter {
  private scene: GameScene | null = null;
  private objects: Map<string, GameObject> = new Map();
  private transforms: Map<string, Transform> = new Map();
  private originalTransforms: Map<string, Transform> = new Map(); // Store original transforms for reset
  private liveTransforms: Map<string, THREE.Matrix4> = new Map();
  private sceneSnapshot: GameScene | null = null; // Full scene snapshot
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
    this.stop();
    this.scene = scene;
    this.objects.clear();
    this.transforms.clear();
    this.originalTransforms.clear();
    this.liveTransforms.clear();
    this.threeObjects.clear();
    this.rigidBodies.clear();
    this.sceneSnapshot = null;

    if (this.scene) {
      this.buildObjectMap(this.scene.objects);
    }

    this.emit("sceneChanged", { scene });
  }

  private buildObjectMap(
    objects: GameObject[],
    parentTransform = new THREE.Matrix4(),
  ): void {
    for (const obj of objects) {
      this.objects.set(obj.id, obj);
      this.transforms.set(obj.id, { ...obj.transform });
      this.originalTransforms.set(obj.id, { ...obj.transform }); // Store original transform

      const localMatrix = new THREE.Matrix4();
      const { position, rotation, scale } = obj.transform;

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
      this.liveTransforms.set(obj.id, worldMatrix.clone());

      if (obj.children && obj.children.length > 0) {
        this.buildObjectMap(obj.children, worldMatrix);
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
        const updateSnapshotTransforms = (objects: GameObject[]) => {
          objects.forEach((obj) => {
            if (obj.id === objectId) {
              obj.transform = { ...newTransform };
            }
            if (obj.children && obj.children.length > 0) {
              updateSnapshotTransforms(obj.children);
            }
          });
        };
        updateSnapshotTransforms(this.sceneSnapshot.objects);
      }
    }

    // Rebuild object map to update world transforms for all children
    if (this.scene) {
      this.buildObjectMap(this.scene.objects);
    }

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

  updateObjectComponent(
    objectId: string,
    componentId: string,
    updates: Partial<GameObjectComponent>,
  ): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;

    const componentIndex = obj.components.findIndex(
      (c) => c.id === componentId,
    );
    if (componentIndex === -1) return;

    obj.components[componentIndex] = {
      ...obj.components[componentIndex],
      ...updates,
    };

    this.emit("objectUpdate", {
      objectId,
      updates: { components: obj.components },
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
  applyForce(objectId: string, force: Vector3, point?: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    if (point) rigidBody.applyForceAtPoint(force, point, true);
    else rigidBody.applyForce(force, true);
  }

  applyImpulse(objectId: string, impulse: Vector3, point?: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    if (point) rigidBody.applyImpulseAtPoint(impulse, point, true);
    else rigidBody.applyImpulse(impulse, true);
  }

  setVelocity(objectId: string, velocity: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    rigidBody.setLinvel(velocity, true);
  }

  setAngularVelocity(objectId: string, angularVelocity: Vector3): void {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return;
    rigidBody.setAngvel(angularVelocity, true);
  }

  getVelocity(objectId: string): Vector3 | null {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return null;
    const v = rigidBody.linvel();
    return { x: v.x, y: v.y, z: v.z };
  }

  getAngularVelocity(objectId: string): Vector3 | null {
    const rigidBody = this.rigidBodies.get(objectId);
    if (!rigidBody) return null;
    const av = rigidBody.angvel();
    return { x: av.x, y: av.y, z: av.z };
  }

  // Game Loop
  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.lastUpdateTime = performance.now();
  }
  stop(): void {
    this._isRunning = false;
  }
  pause(): void {
    this._isRunning = false;
  }
  resume(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.lastUpdateTime = performance.now();
  }

  // Scene Snapshot Management
  createSceneSnapshot(): void {
    if (!this.scene) return;

    // Create a deep copy of the scene, but ensure we capture the original transforms
    // not any runtime modifications that may have occurred
    const sceneWithOriginalTransforms = JSON.parse(JSON.stringify(this.scene));

    // Recursively restore original transforms in the snapshot
    const restoreOriginalTransforms = (objects: GameObject[]) => {
      objects.forEach((obj) => {
        const originalTransform = this.originalTransforms.get(obj.id);
        if (originalTransform) {
          obj.transform = { ...originalTransform };
        }
        if (obj.children && obj.children.length > 0) {
          restoreOriginalTransforms(obj.children);
        }
      });
    };

    restoreOriginalTransforms(sceneWithOriginalTransforms.objects);
    this.sceneSnapshot = sceneWithOriginalTransforms;
    console.log("Scene snapshot created with original transforms.");
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
      this.buildObjectMap(this.scene.objects);
    }

    // 3. CRITICAL FIX: Synchronize originalTransforms with the restored state
    // This ensures that the restored state becomes the new baseline for any subsequent manual edits during stopped physics
    this.objects.forEach((obj, objectId) => {
      this.originalTransforms.set(objectId, { ...obj.transform });
    });

    // 4. Iterate over all objects and imperatively reset their states.
    this.objects.forEach((obj, objectId) => {
      const { transform } = obj;

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

    console.log(
      "Scene snapshot restored with synchronized original transforms.",
    );
    // This will trigger a re-render for UI consistency.
    if (this.scene) {
      console.log("sending scene event", this.scene);
      this.emit("sceneChanged", { scene: this.scene });
    }
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
  getSelectedObjectData(objectId: string): GameObject | null {
    return this.objects.get(objectId) || null;
  }
  getAllObjects(): GameObject[] {
    return this.scene ? this.scene.objects : [];
  }
  findObjectById(objectId: string): GameObject | null {
    return this.objects.get(objectId) || null;
  }
  findObjectsByTag(tag: string): GameObject[] {
    return Array.from(this.objects.values()).filter((obj) =>
      obj.tags?.includes(tag),
    );
  }
  findObjectsByComponent(type: string): GameObject[] {
    return Array.from(this.objects.values()).filter((obj) =>
      obj.components.some((c) => c.type === type),
    );
  }
  isRunning(): boolean {
    return this._isRunning;
  }
  getScene(): GameScene | null {
    return this.scene;
  }

  dispose(): void {
    this.stop();
    this.objects.clear();
    this.transforms.clear();
    this.originalTransforms.clear();
    this.liveTransforms.clear();
    this.sceneSnapshot = null;
    this.rigidBodies.clear();
    this.threeObjects.clear();
    this.updateCallbacks.clear();
    this.removeAllListeners();
  }
}

// Singleton instance for the editor
export const gameWorld = new GameWorld();
