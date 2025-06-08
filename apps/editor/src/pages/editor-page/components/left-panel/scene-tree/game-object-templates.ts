import { 
  Box, 
  Camera, 
  Lightbulb, 
  Circle, 
  Square, 
  Triangle,
  Hexagon,
  Cylinder,
  Cone,
  Diamond,
  Octagon,
  Sun,
  Moon,
  Video,
  Shapes,
  Flashlight
} from "lucide-react";

export const gameObjectTemplates = [
  // GEOMETRIES
  {
    id: 'cube',
    name: 'Box',
    description: 'BoxGeometry - A basic 3D box mesh',
    icon: Box,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'box',
            material: 'standard',
            geometryProps: {
              width: 1,
              height: 1,
              depth: 1,
              widthSegments: 1,
              heightSegments: 1,
              depthSegments: 1
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'sphere',
    name: 'Sphere',
    description: 'SphereGeometry - A basic 3D sphere mesh',
    icon: Circle,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'sphere',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              widthSegments: 32,
              heightSegments: 16,
              phiStart: 0,
              phiLength: Math.PI * 2,
              thetaStart: 0,
              thetaLength: Math.PI
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'plane',
    name: 'Plane',
    description: 'PlaneGeometry - A flat rectangular surface',
    icon: Square,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'plane',
            material: 'standard',
            geometryProps: {
              width: 2,
              height: 2,
              widthSegments: 1,
              heightSegments: 1
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: false,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'cylinder',
    name: 'Cylinder',
    description: 'CylinderGeometry - A cylindrical mesh',
    icon: Cylinder,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'cylinder',
            material: 'standard',
            geometryProps: {
              radiusTop: 0.5,
              radiusBottom: 0.5,
              height: 1,
              radialSegments: 32,
              heightSegments: 1,
              openEnded: false,
              thetaStart: 0,
              thetaLength: Math.PI * 2
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'cone',
    name: 'Cone',
    description: 'ConeGeometry - A conical mesh',
    icon: Cone,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'cone',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              height: 1,
              radialSegments: 32,
              heightSegments: 1,
              openEnded: false,
              thetaStart: 0,
              thetaLength: Math.PI * 2
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'torus',
    name: 'Torus',
    description: 'TorusGeometry - A torus (doughnut) mesh',
    icon: Circle,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'torus',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              tube: 0.2,
              radialSegments: 16,
              tubularSegments: 100,
              arc: Math.PI * 2
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'torus-knot',
    name: 'Torus Knot',
    description: 'TorusKnotGeometry - A torus knot mesh',
    icon: Shapes,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'torusKnot',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              tube: 0.15,
              tubularSegments: 64,
              radialSegments: 8,
              p: 2,
              q: 3
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'capsule',
    name: 'Capsule',
    description: 'CapsuleGeometry - A capsule mesh',
    icon: Cylinder,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'capsule',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              length: 1,
              capSegments: 4,
              radialSegments: 8
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'circle',
    name: 'Circle',
    description: 'CircleGeometry - A circular flat mesh',
    icon: Circle,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'circle',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              segments: 32,
              thetaStart: 0,
              thetaLength: Math.PI * 2
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: false,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'ring',
    name: 'Ring',
    description: 'RingGeometry - A ring-shaped flat mesh',
    icon: Circle,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'ring',
            material: 'standard',
            geometryProps: {
              innerRadius: 0.3,
              outerRadius: 0.6,
              thetaSegments: 32,
              phiSegments: 1,
              thetaStart: 0,
              thetaLength: Math.PI * 2
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: false,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'dodecahedron',
    name: 'Dodecahedron',
    description: 'DodecahedronGeometry - A dodecahedron mesh',
    icon: Hexagon,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'dodecahedron',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              detail: 0
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'icosahedron',
    name: 'Icosahedron',
    description: 'IcosahedronGeometry - An icosahedron mesh',
    icon: Diamond,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'icosahedron',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              detail: 0
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'octahedron',
    name: 'Octahedron',
    description: 'OctahedronGeometry - An octahedron mesh',
    icon: Octagon,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'octahedron',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              detail: 0
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },
  {
    id: 'tetrahedron',
    name: 'Tetrahedron',
    description: 'TetrahedronGeometry - A tetrahedron mesh',
    icon: Triangle,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'mesh-component',
          type: 'Mesh',
          enabled: true,
          properties: {
            geometry: 'tetrahedron',
            material: 'standard',
            geometryProps: {
              radius: 0.5,
              detail: 0
            },
            materialProps: {
              color: '#ffffff',
              metalness: 0.1,
              roughness: 0.3
            },
            castShadow: true,
            receiveShadow: true
          }
        }
      ],
      visible: true,
      tags: ['geometry'],
      layer: 0
    }
  },

  // LIGHTS
  {
    id: 'ambient-light',
    name: 'Ambient Light',
    description: 'AmbientLight - Global ambient lighting',
    icon: Sun,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'light-component',
          type: 'AmbientLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 0.4
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'directional-light',
    name: 'Directional Light',
    description: 'DirectionalLight - Directional light source (like sunlight)',
    icon: Lightbulb,
    template: {
      transform: {
        position: { x: 5, y: 10, z: 5 },
        rotation: { x: -1, y: 0.5, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'light-component',
          type: 'DirectionalLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1,
            castShadow: true,
            shadowMapSize: 1024,
            shadowCameraNear: 0.5,
            shadowCameraFar: 50,
            shadowCameraLeft: -10,
            shadowCameraRight: 10,
            shadowCameraTop: 10,
            shadowCameraBottom: -10
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'point-light',
    name: 'Point Light',
    description: 'PointLight - Light that radiates in all directions',
    icon: Lightbulb,
    template: {
      transform: {
        position: { x: 0, y: 3, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'light-component',
          type: 'PointLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1,
            distance: 100,
            decay: 2,
            castShadow: false,
            shadowMapSize: 512
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'spot-light',
    name: 'Spot Light',
    description: 'SpotLight - Light emitted from a single point in one direction',
    icon: Flashlight,
    template: {
      transform: {
        position: { x: 0, y: 5, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'light-component',
          type: 'SpotLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1,
            distance: 100,
            angle: Math.PI / 3,
            penumbra: 0,
            decay: 2,
            castShadow: true,
            shadowMapSize: 1024
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'hemisphere-light',
    name: 'Hemisphere Light',
    description: 'HemisphereLight - Light source positioned directly above the scene',
    icon: Moon,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'light-component',
          type: 'HemisphereLight',
          enabled: true,
          properties: {
            skyColor: '#ffffff',
            groundColor: '#444444',
            intensity: 0.6
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'rect-area-light',
    name: 'Rect Area Light',
    description: 'RectAreaLight - Light emitted uniformly across a rectangular plane',
    icon: Square,
    template: {
      transform: {
        position: { x: 0, y: 5, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'light-component',
          type: 'RectAreaLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1,
            width: 10,
            height: 10
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },

  // CAMERAS
  {
    id: 'perspective-camera',
    name: 'Perspective Camera',
    description: 'PerspectiveCamera - Camera with perspective projection',
    icon: Camera,
    template: {
      transform: {
        position: { x: 0, y: 5, z: 10 },
        rotation: { x: -0.2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'camera-component',
          type: 'PerspectiveCamera',
          enabled: true,
          properties: {
            fov: 75,
            aspect: 16/9,
            near: 0.1,
            far: 1000,
            isMain: false
          }
        }
      ],
      visible: true,
      tags: ['camera'],
      layer: 0
    }
  },
  {
    id: 'orthographic-camera',
    name: 'Orthographic Camera',
    description: 'OrthographicCamera - Camera with orthographic projection',
    icon: Video,
    template: {
      transform: {
        position: { x: 0, y: 5, z: 10 },
        rotation: { x: -0.2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'camera-component',
          type: 'OrthographicCamera',
          enabled: true,
          properties: {
            left: -10,
            right: 10,
            top: 10,
            bottom: -10,
            near: 0.1,
            far: 1000,
            isMain: false
          }
        }
      ],
      visible: true,
      tags: ['camera'],
      layer: 0
    }
  }
]; 