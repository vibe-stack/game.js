import React, { forwardRef, useRef, useMemo } from "react";
import { PivotControls } from "@react-three/drei";
import * as THREE from "three";
import { renderComponent } from "./component-renderers";
import useEditorStore from "@/stores/editor-store";
import RigidBodyRenderer from "./physics/rigid-body-renderer";
import ColliderRenderer from "./physics/collider-renderer";

/**
 * SceneObject Component - Handles both visual and physics object rendering
 * 
 * TRANSFORM ARCHITECTURE:
 * ======================
 * 
 * NON-PHYSICS OBJECTS:
 * - Transform applied to the outer THREE.Group via position/rotation/scale props
 * - Visual components rendered inside the group inherit the transform
 * 
 * PHYSICS OBJECTS (with RigidBody component):
 * - Transform NOT applied to the outer group (would conflict with physics)
 * - RigidBody component becomes the transform owner
 * - Position/rotation controlled by physics simulation
 * - Scale applied to inner group (physics doesn't handle scale)
 * - Transform flow: GameObject -> RigidBody -> Physics World -> GameObject (during simulation)
 * 
 * EDITOR INTERACTION:
 * - PivotControls work for both types by updating GameObject.transform
 * - For physics objects: GameObject.transform -> RigidBody updates
 * - For non-physics objects: GameObject.transform -> Group props
 */

interface SceneObjectProps {
  obj: GameObject;
  selectedObjects: string[];
  onSelect: (id: string) => void;
  renderType?: "solid" | "wireframe" | "normals" | "realistic";
}

const SceneObject = forwardRef<THREE.Group, SceneObjectProps>(({ obj, selectedObjects, onSelect, renderType = "solid" }, ref) => {
  const { transform, components, children, visible } = obj;
  const { position, rotation, scale } = transform;
  const isSelected = selectedObjects.includes(obj.id);
  const groupRef = useRef<THREE.Group>(null);
  const { editorMode, updateObjectTransform } = useEditorStore();

  if (!visible) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(obj.id);
  };

  // Check if this object has physics components
  const hasRigidBody = components.some(comp => comp.type === 'rigidBody' && comp.enabled);

  // Create initial matrix from current transform values
  const initialMatrix = useMemo(() => {
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3(position.x, position.y, position.z);
    const rot = new THREE.Euler(rotation.x, rotation.y, rotation.z);
    const scl = new THREE.Vector3(scale.x, scale.y, scale.z);
    const quaternion = new THREE.Quaternion().setFromEuler(rot);
    
    matrix.compose(pos, quaternion, scl);
    return matrix;
  }, [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, scale.x, scale.y, scale.z]);

  const handleTransformChange = (local: THREE.Matrix4) => {
    // Extract position, rotation, and scale from the local matrix
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    local.decompose(position, quaternion, scale);
    
    // Convert quaternion to euler rotation
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    
    // Update the object's transform - this will flow through to physics if applicable
    updateObjectTransform(obj.id, {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      scale: { x: scale.x, y: scale.y, z: scale.z }
    });
  };

  const getControlSettings = () => {
    switch (editorMode) {
      case "move":
        return {
          disableAxes: false,
          disableSliders: false,
          disableRotations: true,
          disableScaling: true,
        };
      case "rotate":
        return {
          disableAxes: true,
          disableSliders: true,
          disableRotations: false,
          disableScaling: true,
        };
      case "scale":
        return {
          disableAxes: false,
          disableSliders: false,
          disableRotations: true,
          disableScaling: false,
        };
      default:
        return {
          disableAxes: true,
          disableSliders: true,
          disableRotations: true,
          disableScaling: true,
        };
    }
  };

  // Only apply transform to group if object doesn't have physics
  const groupProps = {
    ref: isSelected ? ref || groupRef : groupRef,
    onClick: handleClick,
    // Only apply transforms when:
    // 1. PivotControls are not active AND
    // 2. Object doesn't have a rigid body (physics will handle transform)
    ...(!(isSelected && editorMode !== "select") && !hasRigidBody && {
      position: [position.x, position.y, position.z] as [number, number, number],
      rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
      scale: [scale.x, scale.y, scale.z] as [number, number, number],
    }),
  };

  const effectiveComponents = components.length > 0 
    ? components 
    : [createDefaultMeshComponent(isSelected, renderType)];

  const groupContent = (
    <group {...groupProps}>
      {renderComponents(effectiveComponents, children, selectedObjects, onSelect, isSelected, renderType, obj.id, transform)}
    </group>
  );

  // Wrap selected objects with PivotControls when not in select mode
  if (isSelected && editorMode !== "select") {
    const controlSettings = getControlSettings();
    
    // PivotControls works for both physics and non-physics objects
    // For physics objects: transforms flow GameObject -> RigidBody -> Physics World
    // For non-physics objects: transforms flow GameObject -> Group props
    return (
      <PivotControls
        matrix={initialMatrix}
        autoTransform={false}
        onDrag={handleTransformChange}
        {...controlSettings}
        scale={70}
        lineWidth={2}
        fixed={true}
        annotations
        depthTest={false}
      >
        {groupContent}
      </PivotControls>
    );
  }

  return groupContent;
});

SceneObject.displayName = "SceneObject";

export default SceneObject;

function createDefaultMeshComponent(isSelected: boolean, renderType: string = "solid"): GameObjectComponent {
  const baseProps = {
    color: isSelected ? '#ffff00' : '#ffa500',
    wireframe: renderType === 'wireframe' || isSelected 
  };

  return {
    id: 'default-mesh',
    type: 'Mesh',
    enabled: true,
    properties: {
      geometry: 'box',
      material: 'standard',
      geometryProps: { width: 1, height: 1, depth: 1 },
      materialProps: baseProps,
      castShadow: true,
      receiveShadow: true,
      renderType
    }
  };
}

function renderComponents(
  components: (GameObjectComponent | PhysicsComponent)[], 
  children: GameObject[], 
  selectedObjects: string[],
  onSelect: (id: string) => void,
  showHelpers: boolean = false,
  renderType: string = "solid",
  objectId?: string,
  transform?: Transform
): React.ReactElement {
  const childElements = children.map((child) => (
    <SceneObject
      key={child.id}
      obj={child}
      selectedObjects={selectedObjects}
      onSelect={onSelect}
      renderType={renderType as any}
    />
  ));

  // Separate physics components
  const rigidBodyComp = components.find(comp => comp.type === 'rigidBody') as RigidBodyComponent | undefined;
  const colliderComponents = components.filter(comp => comp.type === 'collider') as ColliderComponent[];
  const jointComponents = components.filter(comp => comp.type === 'joint') as JointComponent[];
  
  // Filter out physics components for regular rendering
  const regularComponents = components.filter(comp => !['rigidBody', 'collider', 'joint'].includes(comp.type)) as GameObjectComponent[];

  // Render visual content (without physics)
  let visualContent = regularComponents.reduce((acc, component) => {
    const enhancedComponent = {
      ...component,
      properties: {
        ...component.properties,
        renderType
      }
    };
    return renderComponent(enhancedComponent, acc, showHelpers);
  }, <>{childElements}</> as React.ReactElement);

  // If there's a rigid body, wrap everything in RigidBodyRenderer and pass colliders separately
  if (rigidBodyComp && objectId && transform) {
    return (
      <RigidBodyRenderer
        objectId={objectId}
        transform={transform}
        rigidBodyComponent={rigidBodyComp}
        colliderComponents={colliderComponents}
      >
        {visualContent}
      </RigidBodyRenderer>
    );
  }

  // If no rigid body but has colliders, wrap visual content with colliders
  // (This case is for static colliders without rigid bodies)
  colliderComponents.forEach(colliderComponent => {
    visualContent = (
      <ColliderRenderer colliderComponent={colliderComponent}>
        {visualContent}
      </ColliderRenderer>
    );
  });

  // TODO: Handle joints - they need references to connected bodies
  // This is more complex and might need to be handled at a higher level
  if (jointComponents.length > 0) {
    console.log(`Object ${objectId} has ${jointComponents.length} joint components - joint rendering not yet implemented`);
  }

  return visualContent;
} 