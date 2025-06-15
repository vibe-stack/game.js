import { gameWorld } from "@/services/game-world";
import useEditorStore from "@/stores/editor-store";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useRef } from "react";
import * as THREE from "three/webgpu";

export function CameraController({ scene }: { scene: GameScene }) {
  const { camera, controls } = useThree();
  const { viewportMode, physicsState } = useEditorStore();
  const prevActiveCameraRef = useRef<string | undefined>(scene.activeCamera);
  const cameraFollowRef = useRef<{
    camera: GameObject;
    worldMatrix: THREE.Matrix4;
  } | null>(null);

  useEffect(() => {
    if (!scene.activeCamera) return;

    // Find the active camera object and calculate its world transform
    const findCameraWithWorldTransform = (
      objects: GameObject[],
      id: string,
      parentTransform?: THREE.Matrix4,
    ): { camera: GameObject; worldMatrix: THREE.Matrix4 } | null => {
      for (const obj of objects) {
        // Calculate this object's world matrix
        const localMatrix = new THREE.Matrix4();
        const { position, rotation, scale } = obj.transform;
        localMatrix.makeTranslation(position.x, position.y, position.z);

        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(
          new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ"),
        );
        localMatrix.multiply(rotationMatrix);

        const scaleMatrix = new THREE.Matrix4();
        scaleMatrix.makeScale(scale.x, scale.y, scale.z);
        localMatrix.multiply(scaleMatrix);

        // Combine with parent transform if it exists
        const worldMatrix = parentTransform
          ? new THREE.Matrix4().multiplyMatrices(parentTransform, localMatrix)
          : localMatrix;

        if (obj.id === id) {
          const hasCameraComponent = obj.components.some(
            (comp) =>
              comp.type === "PerspectiveCamera" ||
              comp.type === "OrthographicCamera",
          );
          if (hasCameraComponent) return { camera: obj, worldMatrix };
        }

        // Search children with this object's world transform as parent
        const found = findCameraWithWorldTransform(
          obj.children,
          id,
          worldMatrix,
        );
        if (found) return found;
      }
      return null;
    };

    const result = findCameraWithWorldTransform(
      scene.objects,
      scene.activeCamera,
    );
    cameraFollowRef.current = result;

    // Handle camera switching logic
    if (
      viewportMode === "orbit" &&
      controls &&
      scene.activeCamera !== prevActiveCameraRef.current
    ) {
      if (!result) return;

      const { worldMatrix } = result;

      // Extract world position from the world matrix
      const worldPosition = new THREE.Vector3();
      const worldRotation = new THREE.Quaternion();
      worldMatrix.decompose(worldPosition, worldRotation, new THREE.Vector3());

      // If OrbitControls is available, use it for smooth transition
      if (controls && "object" in controls) {
        const orbitControls = controls as any;

        // Set the target position for smooth animation using world coordinates
        orbitControls.object.position.copy(worldPosition);
        orbitControls.target.set(0, 0, 0); // Look at center for now
        orbitControls.update();
      }
    }

    prevActiveCameraRef.current = scene.activeCamera;
  }, [scene.activeCamera, scene.objects, camera, controls, viewportMode]);

  // Update camera transform in camera follow mode
  useFrame(() => {
    if (viewportMode === "camera" && scene.activeCamera && camera) {
      // During physics, get live transforms from the GameWorld
      // During non-physics, use GameObject transforms
      if (physicsState === "playing") {
        // Get live transform from GameWorld
        const liveTransform = gameWorld.getLiveTransform(scene.activeCamera);
        if (liveTransform) {
          // Extract world position and rotation from the live transform
          const worldPosition = new THREE.Vector3();
          const worldRotation = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          liveTransform.decompose(worldPosition, worldRotation, worldScale);

          // Apply to the viewport camera
          camera.position.copy(worldPosition);
          camera.quaternion.copy(worldRotation);
          camera.updateMatrixWorld();
        }
      } else {
        // During non-physics, use the GameObject transforms via GameWorld
        const cameraObj = gameWorld.getObject(scene.activeCamera);
        if (cameraObj) {
          const transform = cameraObj.transform;
          camera.position.set(
            transform.position.x,
            transform.position.y,
            transform.position.z,
          );
          camera.rotation.set(
            transform.rotation.x,
            transform.rotation.y,
            transform.rotation.z,
          );
          camera.updateMatrixWorld();
        }
      }
    }
  });

  return null;
}
