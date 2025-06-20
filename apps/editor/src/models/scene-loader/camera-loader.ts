import { LoaderContext, CameraData } from "./types";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class CameraLoader {
  async load(context: LoaderContext, cameraData: CameraData[]): Promise<void> {
    const cameraManager = context.gameWorld.getCameraManager();
    const controlManager = context.gameWorld.getCameraControlManager();

    for (const data of cameraData) {
      try {
        const camera = this.createCamera(data);
        
        // Add camera to the registry
        cameraManager.addCamera(data.id, data.name, camera);

        // Set as active camera if specified
        if (data.active) {
          cameraManager.setActiveCamera(data.id);
        }

        // Setup camera controls if specified
        if (data.controls) {
          const controls = this.createCameraControls(camera, data.controls, context);
          if (controls) {
            controlManager.addControls(data.id, data.name + " Controls", controls);
          }
        }

        console.log(`Loaded camera: ${data.name} (${data.type})`);
      } catch (error) {
        console.error(`Failed to load camera ${data.name}:`, error);
      }
    }
  }

  private createCamera(data: CameraData): THREE.Camera {
    let camera: THREE.Camera;

    if (data.type === "orthographic") {
      camera = new THREE.OrthographicCamera(
        data.properties.left || -10,
        data.properties.right || 10,
        data.properties.top || 10,
        data.properties.bottom || -10,
        data.properties.near,
        data.properties.far
      );
    } else {
      // Default to perspective camera
      camera = new THREE.PerspectiveCamera(
        data.properties.fov || 75,
        data.properties.aspect || 1,
        data.properties.near,
        data.properties.far
      );
    }

    // Apply position and rotation
    camera.position.set(...data.position);
    camera.rotation.set(...data.rotation);

    // Apply target if specified
    if (data.target) {
      camera.lookAt(new THREE.Vector3(...data.target));
    }

    // Apply zoom if specified (only for cameras that support zoom)
    if (data.properties.zoom && ('zoom' in camera)) {
      (camera as any).zoom = data.properties.zoom;
      (camera as any).updateProjectionMatrix();
    }

    camera.name = data.name;

    return camera;
  }

  private createCameraControls(
    camera: THREE.Camera,
    controlsData: any,
    context: LoaderContext
  ): any {
    if (!controlsData.enabled) {
      return null;
    }

    try {
      let controls: any;

      switch (controlsData.type) {
        case "orbit":
        case "OrbitControls":
          controls = new OrbitControls(camera, context.gameWorld.renderer.domElement);
          
          // Apply orbit controls properties
          if (controlsData.properties) {
            const props = controlsData.properties;
            
            if (props.target) {
              controls.target.set(...props.target);
            }
            if (props.enableDamping !== undefined) {
              controls.enableDamping = props.enableDamping;
            }
            if (props.dampingFactor !== undefined) {
              controls.dampingFactor = props.dampingFactor;
            }
            if (props.enableZoom !== undefined) {
              controls.enableZoom = props.enableZoom;
            }
            if (props.zoomSpeed !== undefined) {
              controls.zoomSpeed = props.zoomSpeed;
            }
            if (props.enableRotate !== undefined) {
              controls.enableRotate = props.enableRotate;
            }
            if (props.rotateSpeed !== undefined) {
              controls.rotateSpeed = props.rotateSpeed;
            }
            if (props.enablePan !== undefined) {
              controls.enablePan = props.enablePan;
            }
            if (props.panSpeed !== undefined) {
              controls.panSpeed = props.panSpeed;
            }
            if (props.autoRotate !== undefined) {
              controls.autoRotate = props.autoRotate;
            }
            if (props.autoRotateSpeed !== undefined) {
              controls.autoRotateSpeed = props.autoRotateSpeed;
            }
            if (props.minDistance !== undefined) {
              controls.minDistance = props.minDistance;
            }
            if (props.maxDistance !== undefined) {
              controls.maxDistance = props.maxDistance;
            }
            if (props.minPolarAngle !== undefined) {
              controls.minPolarAngle = props.minPolarAngle;
            }
            if (props.maxPolarAngle !== undefined) {
              controls.maxPolarAngle = props.maxPolarAngle;
            }
            if (props.minAzimuthAngle !== undefined) {
              controls.minAzimuthAngle = props.minAzimuthAngle;
            }
            if (props.maxAzimuthAngle !== undefined) {
              controls.maxAzimuthAngle = props.maxAzimuthAngle;
            }
          }
          break;

        default:
          console.warn(`Unknown camera controls type: ${controlsData.type}`);
          return null;
      }

      return controls;
    } catch (error) {
      console.error(`Failed to create camera controls (${controlsData.type}):`, error);
      return null;
    }
  }
} 