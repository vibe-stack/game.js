import { 
  Box, 
  Circle, 
  Square,
  Cylinder,
  Cone,
  Hexagon,
  Diamond,
  Octagon,
  Triangle,
  Shapes,
  Route
} from "lucide-react";
import { generateHeightfieldData } from "@/utils/heightfield-generator";

export const geometryTemplates = [
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
  {
    id: 'heightfield',
    name: 'Heightfield',
    description: 'Heightfield - Procedural terrain generator with physics support',
    icon: Shapes,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'heightfield-component',
          type: 'heightfield',
          enabled: true,
          properties: {
            width: 10,
            depth: 10,
            rows: 64,
            columns: 64,
            minElevation: -2,
            maxElevation: 5,
            algorithm: 'perlin',
            seed: 12345,
            noise: {
              frequency: 0.05,
              amplitude: 2.0,
              octaves: 6,
              persistence: 0.6,
              lacunarity: 2.0
            },
            heights: generateHeightfieldData({
              width: 10,
              depth: 10,
              rows: 64,
              columns: 64,
              minElevation: -2,
              maxElevation: 5,
              algorithm: 'perlin',
              seed: 12345,
              noise: {
                frequency: 0.05,
                amplitude: 2.0,
                octaves: 6,
                persistence: 0.6,
                lacunarity: 2.0
              },
              heights: [],
              displacementScale: 1.0,
              smoothing: false,
              lod: {
                enabled: false,
                levels: 3,
                distances: [50, 100, 200],
                simplificationRatio: [0.5, 0.25, 0.1]
              },
              uvScale: { x: 1, y: 1 },
              autoRegenerate: true,
              lastGenerated: new Date()
            }),
            displacementScale: 1.0,
            smoothing: false,
            lod: {
              enabled: false,
              levels: 3,
              distances: [50, 100, 200],
              simplificationRatio: [0.5, 0.25, 0.1]
            },
            uvScale: { x: 1, y: 1 },
            autoRegenerate: true,
            lastGenerated: new Date(),
            materialRef: {
              type: 'inline',
              properties: {
                type: 'standard',
                color: '#8b7355',
                metalness: 0.0,
                roughness: 0.8
              }
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
    id: 'extruded-arc',
    name: 'Extruded Arc',
    description: 'ExtrudedArc - Curved surface for race tracks, spirals, and paths',
    icon: Route,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'extruded-arc-component',
          type: 'extrudedArc',
          enabled: true,
          properties: {
            arcRadius: 5.0,
            pitch: 0.0,
            width: 2.0,
            height: 0.2,
            pathLength: 10.0,
            angle: Math.PI,
            segments: 32,
            closed: false,
            crossSectionSegments: 4,
            extrusionSegments: 1,
            uvScale: { x: 1, y: 1 },
            flipUVs: false,
            autoRegenerate: true,
            lastGenerated: new Date(),
            materialRef: {
              type: 'inline',
              properties: {
                type: 'standard',
                color: '#666666',
                metalness: 0.0,
                roughness: 0.7
              }
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
  }
]; 