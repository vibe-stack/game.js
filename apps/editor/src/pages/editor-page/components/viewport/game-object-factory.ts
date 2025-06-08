export function createCubeObject(name: string = "Cube"): GameObject {
  return {
    id: `cube-${Date.now()}`,
    name,
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
          geometryProps: { width: 1, height: 1, depth: 1 },
          materialProps: { color: '#ffa500', metalness: 0, roughness: 0.7 },
          castShadow: true,
          receiveShadow: true
        }
      }
    ],
    children: [],
    visible: true,
    tags: ['mesh'],
    layer: 0
  };
}

export function createSphereObject(name: string = "Sphere"): GameObject {
  return {
    id: `sphere-${Date.now()}`,
    name,
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
          geometryProps: { radius: 1, widthSegments: 32, heightSegments: 16 },
          materialProps: { color: '#00ff00', metalness: 0, roughness: 0.7 },
          castShadow: true,
          receiveShadow: true
        }
      }
    ],
    children: [],
    visible: true,
    tags: ['mesh'],
    layer: 0
  };
}

export function createPointLightObject(name: string = "Point Light"): GameObject {
  return {
    id: `point-light-${Date.now()}`,
    name,
    transform: {
      position: { x: 0, y: 5, z: 0 },
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
          distance: 0,
          decay: 2,
          castShadow: true
        }
      }
    ],
    children: [],
    visible: true,
    tags: ['light'],
    layer: 0
  };
}

export function createAmbientLightObject(name: string = "Ambient Light"): GameObject {
  return {
    id: `ambient-light-${Date.now()}`,
    name,
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
          intensity: 0.5
        }
      }
    ],
    children: [],
    visible: true,
    tags: ['light'],
    layer: 0
  };
}

export function createEmptyObject(name: string = "Empty"): GameObject {
  return {
    id: `empty-${Date.now()}`,
    name,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    components: [],
    children: [],
    visible: true,
    tags: [],
    layer: 0
  };
} 