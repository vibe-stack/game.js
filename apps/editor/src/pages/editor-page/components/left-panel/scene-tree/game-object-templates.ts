import { Box, Camera, Lightbulb, Circle, Square } from "lucide-react";

export const gameObjectTemplates = [
  {
    id: 'cube',
    name: 'Cube',
    description: 'A basic 3D cube mesh',
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
              depth: 1
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
    description: 'A basic 3D sphere mesh',
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
              heightSegments: 16
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
    description: 'A flat rectangular surface',
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
              height: 2
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
    id: 'directional-light',
    name: 'Directional Light',
    description: 'Directional light source (like sunlight)',
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
            castShadow: true
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
    description: 'Light that radiates in all directions',
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
            decay: 2
          }
        }
      ],
      visible: true,
      tags: ['light'],
      layer: 0
    }
  },
  {
    id: 'camera',
    name: 'Camera',
    description: 'Perspective camera for viewing the scene',
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