import * as THREE from "three";

export class PropertyUpdater {
  static applyObjectPropertyUpdate(
    obj: THREE.Object3D,
    propertyPath: string[],
    value: any
  ): void {
    console.log("applyObjectPropertyUpdate", obj, propertyPath, value);
    const property = propertyPath.join(".");

    // Handle geometry properties that require recreation
    if (property.startsWith("geometry.")) {
      this.handleGeometryPropertyUpdate(obj, property, value);
      return;
    }

    // Handle transform properties
    switch (property) {
      case "position":
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          obj.position.set(value.x, value.y, value.z);
        }
        break;

      case "rotation":
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          obj.rotation.set(value.x, value.y, value.z);
        }
        break;

      case "scale":
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
          obj.scale.set(value.x, value.y, value.z);
        }
        break;

      case "matrix":
        if (Array.isArray(value) && value.length === 16) {
          obj.matrix.fromArray(value);
          obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
        }
        break;

      case "visible":
        obj.visible = Boolean(value);
        break;

      case "material.color":
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.Material
        ) {
          const material = obj.material as any;
          if (material.color) {
            const colorValue =
              typeof value === "string"
                ? parseInt(value.replace("#", ""), 16)
                : value;
            material.color.setHex(colorValue);
          }
        }
        break;

      case "material.opacity":
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.Material
        ) {
          const material = obj.material as any;
          if ("opacity" in material) {
            material.opacity = Number(value);
          }
        }
        break;

      case "material.transparent":
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.Material
        ) {
          const material = obj.material as any;
          if ("transparent" in material) {
            material.transparent = Boolean(value);
          }
        }
        break;

      case "material.roughness":
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshStandardMaterial
        ) {
          obj.material.roughness = Number(value);
        }
        break;

      case "material.metalness":
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshStandardMaterial
        ) {
          obj.material.metalness = Number(value);
        }
        break;

      case "material.wireframe":
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.Material
        ) {
          const material = obj.material as any;
          if ("wireframe" in material) {
            material.wireframe = Boolean(value);
          }
        }
        break;

      default:
        // Fallback to generic nested property setting
        this.setNestedProperty(obj, property, value);
        break;
    }
  }

  private static handleGeometryPropertyUpdate(
    obj: THREE.Object3D,
    property: string,
    value: any
  ): void {
    if (!(obj instanceof THREE.Mesh)) return;

    const geometryProperty = property.replace("geometry.", "");
    const currentGeometry = obj.geometry;
    let newGeometry: THREE.BufferGeometry | null = null;

    // Handle different geometry types and their specific properties
    if (currentGeometry instanceof THREE.BoxGeometry) {
      newGeometry = this.updateBoxGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.SphereGeometry) {
      newGeometry = this.updateSphereGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.CylinderGeometry) {
      newGeometry = this.updateCylinderGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.PlaneGeometry) {
      newGeometry = this.updatePlaneGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.TorusGeometry) {
      newGeometry = this.updateTorusGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.ConeGeometry) {
      newGeometry = this.updateConeGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.RingGeometry) {
      newGeometry = this.updateRingGeometry(currentGeometry, geometryProperty, value);
    } else if (currentGeometry instanceof THREE.TetrahedronGeometry) {
      newGeometry = this.updatePolyhedronGeometry(currentGeometry, geometryProperty, value, 'tetrahedron');
    } else if (currentGeometry instanceof THREE.OctahedronGeometry) {
      newGeometry = this.updatePolyhedronGeometry(currentGeometry, geometryProperty, value, 'octahedron');
    } else if (currentGeometry instanceof THREE.IcosahedronGeometry) {
      newGeometry = this.updatePolyhedronGeometry(currentGeometry, geometryProperty, value, 'icosahedron');
    } else if (currentGeometry instanceof THREE.DodecahedronGeometry) {
      newGeometry = this.updatePolyhedronGeometry(currentGeometry, geometryProperty, value, 'dodecahedron');
    }

    if (newGeometry) {
      // Dispose old geometry to prevent memory leaks
      currentGeometry.dispose();
      obj.geometry = newGeometry;
    }
  }

  private static updateBoxGeometry(
    geometry: THREE.BoxGeometry,
    property: string,
    value: any
  ): THREE.BoxGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "width":
        return new THREE.BoxGeometry(
          Number(value),
          params.height,
          params.depth,
          params.widthSegments,
          params.heightSegments,
          params.depthSegments
        );
      case "height":
        return new THREE.BoxGeometry(
          params.width,
          Number(value),
          params.depth,
          params.widthSegments,
          params.heightSegments,
          params.depthSegments
        );
      case "depth":
        return new THREE.BoxGeometry(
          params.width,
          params.height,
          Number(value),
          params.widthSegments,
          params.heightSegments,
          params.depthSegments
        );
      case "widthSegments":
        return new THREE.BoxGeometry(
          params.width,
          params.height,
          params.depth,
          Number(value),
          params.heightSegments,
          params.depthSegments
        );
      case "heightSegments":
        return new THREE.BoxGeometry(
          params.width,
          params.height,
          params.depth,
          params.widthSegments,
          Number(value),
          params.depthSegments
        );
      case "depthSegments":
        return new THREE.BoxGeometry(
          params.width,
          params.height,
          params.depth,
          params.widthSegments,
          params.heightSegments,
          Number(value)
        );
      default:
        return null;
    }
  }

  private static updateSphereGeometry(
    geometry: THREE.SphereGeometry,
    property: string,
    value: any
  ): THREE.SphereGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "radius":
        return new THREE.SphereGeometry(
          Number(value),
          params.widthSegments,
          params.heightSegments,
          params.phiStart,
          params.phiLength,
          params.thetaStart,
          params.thetaLength
        );
      case "widthSegments":
        return new THREE.SphereGeometry(
          params.radius,
          Number(value),
          params.heightSegments,
          params.phiStart,
          params.phiLength,
          params.thetaStart,
          params.thetaLength
        );
      case "heightSegments":
        return new THREE.SphereGeometry(
          params.radius,
          params.widthSegments,
          Number(value),
          params.phiStart,
          params.phiLength,
          params.thetaStart,
          params.thetaLength
        );
      default:
        return null;
    }
  }

  private static updateCylinderGeometry(
    geometry: THREE.CylinderGeometry,
    property: string,
    value: any
  ): THREE.CylinderGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "radiusTop":
        return new THREE.CylinderGeometry(
          Number(value),
          params.radiusBottom,
          params.height,
          params.radialSegments,
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      case "radiusBottom":
        return new THREE.CylinderGeometry(
          params.radiusTop,
          Number(value),
          params.height,
          params.radialSegments,
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      case "height":
        return new THREE.CylinderGeometry(
          params.radiusTop,
          params.radiusBottom,
          Number(value),
          params.radialSegments,
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      case "radialSegments":
        return new THREE.CylinderGeometry(
          params.radiusTop,
          params.radiusBottom,
          params.height,
          Number(value),
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      default:
        return null;
    }
  }

  private static updatePlaneGeometry(
    geometry: THREE.PlaneGeometry,
    property: string,
    value: any
  ): THREE.PlaneGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "width":
        return new THREE.PlaneGeometry(
          Number(value),
          params.height,
          params.widthSegments,
          params.heightSegments
        );
      case "height":
        return new THREE.PlaneGeometry(
          params.width,
          Number(value),
          params.widthSegments,
          params.heightSegments
        );
      case "widthSegments":
        return new THREE.PlaneGeometry(
          params.width,
          params.height,
          Number(value),
          params.heightSegments
        );
      case "heightSegments":
        return new THREE.PlaneGeometry(
          params.width,
          params.height,
          params.widthSegments,
          Number(value)
        );
      default:
        return null;
    }
  }

  private static updateTorusGeometry(
    geometry: THREE.TorusGeometry,
    property: string,
    value: any
  ): THREE.TorusGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "radius":
        return new THREE.TorusGeometry(
          Number(value),
          params.tube,
          params.radialSegments,
          params.tubularSegments,
          params.arc
        );
      case "tube":
        return new THREE.TorusGeometry(
          params.radius,
          Number(value),
          params.radialSegments,
          params.tubularSegments,
          params.arc
        );
      case "radialSegments":
        return new THREE.TorusGeometry(
          params.radius,
          params.tube,
          Number(value),
          params.tubularSegments,
          params.arc
        );
      case "tubularSegments":
        return new THREE.TorusGeometry(
          params.radius,
          params.tube,
          params.radialSegments,
          Number(value),
          params.arc
        );
      default:
        return null;
    }
  }

  private static updateConeGeometry(
    geometry: THREE.ConeGeometry,
    property: string,
    value: any
  ): THREE.ConeGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "radius":
        return new THREE.ConeGeometry(
          Number(value),
          params.height,
          params.radialSegments,
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      case "height":
        return new THREE.ConeGeometry(
          params.radius,
          Number(value),
          params.radialSegments,
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      case "radialSegments":
        return new THREE.ConeGeometry(
          params.radius,
          params.height,
          Number(value),
          params.heightSegments,
          params.openEnded,
          params.thetaStart,
          params.thetaLength
        );
      default:
        return null;
    }
  }

  private static updateRingGeometry(
    geometry: THREE.RingGeometry,
    property: string,
    value: any
  ): THREE.RingGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "innerRadius":
        return new THREE.RingGeometry(
          Number(value),
          params.outerRadius,
          params.thetaSegments,
          params.phiSegments,
          params.thetaStart,
          params.thetaLength
        );
      case "outerRadius":
        return new THREE.RingGeometry(
          params.innerRadius,
          Number(value),
          params.thetaSegments,
          params.phiSegments,
          params.thetaStart,
          params.thetaLength
        );
      case "thetaSegments":
        return new THREE.RingGeometry(
          params.innerRadius,
          params.outerRadius,
          Number(value),
          params.phiSegments,
          params.thetaStart,
          params.thetaLength
        );
      default:
        return null;
    }
  }

  private static updatePolyhedronGeometry(
    geometry: THREE.TetrahedronGeometry | THREE.OctahedronGeometry | THREE.IcosahedronGeometry | THREE.DodecahedronGeometry,
    property: string,
    value: any,
    type: 'tetrahedron' | 'octahedron' | 'icosahedron' | 'dodecahedron'
  ): THREE.BufferGeometry | null {
    const params = geometry.parameters;
    
    switch (property) {
      case "radius":
        switch (type) {
          case 'tetrahedron':
            return new THREE.TetrahedronGeometry(Number(value), params.detail);
          case 'octahedron':
            return new THREE.OctahedronGeometry(Number(value), params.detail);
          case 'icosahedron':
            return new THREE.IcosahedronGeometry(Number(value), params.detail);
          case 'dodecahedron':
            return new THREE.DodecahedronGeometry(Number(value), params.detail);
        }
        break;
      case "detail":
        switch (type) {
          case 'tetrahedron':
            return new THREE.TetrahedronGeometry(params.radius, Number(value));
          case 'octahedron':
            return new THREE.OctahedronGeometry(params.radius, Number(value));
          case 'icosahedron':
            return new THREE.IcosahedronGeometry(params.radius, Number(value));
          case 'dodecahedron':
            return new THREE.DodecahedronGeometry(params.radius, Number(value));
        }
        break;
      default:
        return null;
    }
  }

  private static setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
      if (!current) return;
    }

    const finalKey = keys[keys.length - 1];

    if (current[finalKey] && typeof current[finalKey].set === "function") {
      if (Array.isArray(value)) {
        current[finalKey].set(...value);
      } else {
        current[finalKey].set(value);
      }
    } else if (
      current[finalKey] &&
      typeof current[finalKey].copy === "function"
    ) {
      current[finalKey].copy(value);
    } else {
      current[finalKey] = value;
    }
  }
} 