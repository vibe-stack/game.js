import { Camera, Video } from "lucide-react";

export const cameraTemplates = [
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