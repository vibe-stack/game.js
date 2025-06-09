import React from "react";
import * as THREE from "three";

export function createDefaultMeshComponent(isSelected: boolean, renderType: string = "solid"): GameObjectComponent {
  const baseColor = isSelected ? '#ffff00' : '#ffa500';
  const wireframe = renderType === 'wireframe' || isSelected;

  return {
    id: 'default-mesh',
    type: 'Mesh',
    enabled: true,
    properties: {
      geometry: 'box',
      geometryProps: { width: 1, height: 1, depth: 1 },
      materialRef: {
        type: 'inline',
        properties: {
          type: 'standard',
          color: baseColor,
          wireframe,
          metalness: 0.1,
          roughness: 0.7
        }
      },
      castShadow: true,
      receiveShadow: true,
      renderType
    }
  };
}

export function separatePhysicsComponents(components: (GameObjectComponent | PhysicsComponent)[]) {
  const rigidBodyComp = components.find(comp => comp.type === 'rigidBody') as RigidBodyComponent | undefined;
  const colliderComponents = components.filter(comp => comp.type === 'collider') as ColliderComponent[];
  const jointComponents = components.filter(comp => comp.type === 'joint') as JointComponent[];
  const regularComponents = components.filter(comp => !['rigidBody', 'collider', 'joint'].includes(comp.type)) as GameObjectComponent[];

  return {
    rigidBodyComp,
    colliderComponents,
    jointComponents,
    regularComponents
  };
}

export function shouldApplyTransformToGroup(hasRigidBody: boolean, isControlledByPivot: boolean): boolean {
  // When pivot controls are active, DON'T apply transforms to group (pivot controls handle it via matrix)
  // When pivot controls are not active, apply transforms only for non-physics objects
  return !isControlledByPivot && !hasRigidBody;
}

export function createGroupProps(
  obj: GameObject,
  isSelected: boolean,
  ref: React.ForwardedRef<THREE.Group>,
  groupRef: React.RefObject<THREE.Group>,
  onSelect: (id: string) => void,
  shouldApplyTransform: boolean
) {
  const { transform } = obj;
  const { position, rotation, scale } = transform;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(obj.id);
  };

  return {
    ref: isSelected ? (ref || groupRef) : groupRef,
    onClick: handleClick,
    ...(shouldApplyTransform && {
      position: [position.x, position.y, position.z] as [number, number, number],
      rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
      scale: [scale.x, scale.y, scale.z] as [number, number, number],
    }),
  };
} 