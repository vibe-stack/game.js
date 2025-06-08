import React from "react";
import { Plus, Box, Zap, Lightbulb, Camera, Magnet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

interface AddComponentMenuProps {
  onAddComponent: (component: GameObjectComponent | PhysicsComponent) => void;
}

export default function AddComponentMenu({ onAddComponent }: AddComponentMenuProps) {
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const createDefaultComponent = (type: string): GameObjectComponent | PhysicsComponent => {
    const baseComponent = {
      id: generateId(),
      enabled: true
    };

    switch (type) {
      case 'Mesh':
        return {
          ...baseComponent,
          type: 'Mesh',
          properties: {
            geometry: 'box',
            geometryProps: {},
            materialProps: {
              color: '#ffffff',
              metalness: 0,
              roughness: 0.5
            },
            castShadow: true,
            receiveShadow: true
          }
        };

      case 'DirectionalLight':
        return {
          ...baseComponent,
          type: 'DirectionalLight',
          properties: {
            color: '#ffffff',
            intensity: 1,
            castShadow: true,
            shadowMapSize: 1024,
            shadowCameraNear: 0.1,
            shadowCameraFar: 100,
            shadowCameraLeft: -10,
            shadowCameraRight: 10,
            shadowCameraTop: 10,
            shadowCameraBottom: -10
          }
        };

      case 'PointLight':
        return {
          ...baseComponent,
          type: 'PointLight',
          properties: {
            color: '#ffffff',
            intensity: 1,
            distance: 0,
            decay: 2,
            castShadow: false,
            shadowMapSize: 512,
            shadowCameraNear: 0.1,
            shadowCameraFar: 25
          }
        };

      case 'PerspectiveCamera':
        return {
          ...baseComponent,
          type: 'PerspectiveCamera',
          properties: {
            fov: 75,
            aspect: 1.777,
            near: 0.1,
            far: 1000,
            isMain: false
          }
        };

      case 'rigidBody':
        return {
          ...baseComponent,
          type: 'rigidBody',
          properties: {
            bodyType: 'dynamic' as RigidBodyType,
            mass: 1,
            linearDamping: 0.01,
            angularDamping: 0.05,
            gravityScale: 1,
            canSleep: true,
            sleeping: false,
            lockTranslations: { x: false, y: false, z: false },
            lockRotations: { x: false, y: false, z: false },
            dominanceGroup: 0
          }
        } as RigidBodyComponent;

      case 'collider':
        return {
          ...baseComponent,
          type: 'collider',
          properties: {
            shape: { type: 'box', halfExtents: { x: 0.5, y: 0.5, z: 0.5 } } as ColliderShape,
            isSensor: false,
            density: 1,
            material: {
              friction: 0.5,
              restitution: 0.1,
              frictionCombineRule: 'average' as const,
              restitutionCombineRule: 'average' as const
            },
            collisionGroups: { membership: 1, filter: 0xFFFF },
            solverGroups: { membership: 1, filter: 0xFFFF },
            activeCollisionTypes: {
              default: true,
              kinematic: true,
              sensor: true
            },
            activeEvents: {
              collisionEvents: false,
              contactForceEvents: false
            },
            contactForceEventThreshold: 0.01,
            massModification: 'density' as const
          }
        } as ColliderComponent;

      case 'joint':
        return {
          ...baseComponent,
          type: 'joint',
          properties: {
            jointType: 'fixed' as JointType,
            connectedBody: '',
            anchor1: { x: 0, y: 0, z: 0 },
            anchor2: { x: 0, y: 0, z: 0 },
            axis1: { x: 1, y: 0, z: 0 },
            limits: { min: -Math.PI, max: Math.PI },
            motor: {
              targetVel: 0,
              targetPos: 0,
              stiffness: 0,
              damping: 0,
              maxForce: 0
            }
          }
        } as JointComponent;

      default:
        return {
          ...baseComponent,
          type,
          properties: {}
        };
    }
  };

  const handleAddComponent = (type: string) => {
    const component = createDefaultComponent(type);
    onAddComponent(component);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="">
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Rendering</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAddComponent('Mesh')}>
          <Box className="h-4 w-4 mr-2" />
          Mesh Renderer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs">Lighting</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAddComponent('DirectionalLight')}>
          <Lightbulb className="h-4 w-4 mr-2" />
          Directional Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddComponent('PointLight')}>
          <Lightbulb className="h-4 w-4 mr-2" />
          Point Light
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs">Camera</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAddComponent('PerspectiveCamera')}>
          <Camera className="h-4 w-4 mr-2" />
          Perspective Camera
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs">Physics</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleAddComponent('rigidBody')}>
          <Zap className="h-4 w-4 mr-2" />
          Rigid Body
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddComponent('collider')}>
          <Box className="h-4 w-4 mr-2" />
          Collider
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddComponent('joint')}>
          <Magnet className="h-4 w-4 mr-2" />
          Joint
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 