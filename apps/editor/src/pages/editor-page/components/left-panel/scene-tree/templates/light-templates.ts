import { Sun, Lightbulb, Flashlight, Zap } from "lucide-react";

export const lightTemplates = [
  {
    id: 'directional-light',
    name: 'Directional Light',
    description: 'DirectionalLight - Simulates sunlight with parallel rays',
    icon: Sun,
    template: {
      transform: {
        position: { x: 5, y: 10, z: 5 },
        rotation: { x: -Math.PI / 4, y: Math.PI / 4, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'directional-light-component',
          type: 'DirectionalLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1.0,
            castShadow: true,
            shadowMapSize: 2048,
            shadowCameraNear: 0.1,
            shadowCameraFar: 50,
            shadowCameraLeft: -10,
            shadowCameraRight: 10,
            shadowCameraTop: 10,
            shadowCameraBottom: -10,
            shadowBias: -0.0001,
            shadowNormalBias: 0.02
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
    description: 'PointLight - Emits light from a single point in all directions',
    icon: Lightbulb,
    template: {
      transform: {
        position: { x: 0, y: 5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'point-light-component',
          type: 'PointLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1.0,
            distance: 0,
            decay: 2,
            castShadow: true,
            shadowMapSize: 1024,
            shadowBias: -0.0001,
            shadowNormalBias: 0.02
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
    description: 'SpotLight - Emits light in a cone from a single point',
    icon: Flashlight,
    template: {
      transform: {
        position: { x: 0, y: 10, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'spot-light-component',
          type: 'SpotLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 1.0,
            distance: 0,
            angle: Math.PI / 6,
            penumbra: 0.1,
            decay: 2,
            castShadow: true,
            shadowMapSize: 1024,
            shadowBias: -0.0001,
            shadowNormalBias: 0.02
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'ambient-light',
    name: 'Ambient Light',
    description: 'AmbientLight - Provides soft global illumination',
    icon: Zap,
    template: {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'ambient-light-component',
          type: 'AmbientLight',
          enabled: true,
          properties: {
            color: '#ffffff',
            intensity: 0.5
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
    description: 'HemisphereLight - Sky and ground lighting simulation',
    icon: Sun,
    template: {
      transform: {
        position: { x: 0, y: 10, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: [
        {
          id: 'hemisphere-light-component',
          type: 'HemisphereLight',
          enabled: true,
          properties: {
            skyColor: '#87CEEB',
            groundColor: '#654321',
            intensity: 0.6
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  }
]; 