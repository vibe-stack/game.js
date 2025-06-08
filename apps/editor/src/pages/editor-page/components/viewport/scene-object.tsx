import React, { forwardRef, useRef, useCallback } from "react";
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
  const { editorMode, updateObjectTransform, physicsState } = useEditorStore();
  
  // Use a ref to maintain transform matrix stability
  const matrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const isManipulatingRef = useRef(false);
  const lastTransformRef = useRef<Transform>(transform);

  // Update matrix when transform changes from external sources (not during manipulation)
  React.useLayoutEffect(() => {
    // Check if transform has actually changed
    const lastTransform = lastTransformRef.current;
    const hasChanged = 
      lastTransform.position.x !== position.x ||
      lastTransform.position.y !== position.y ||
      lastTransform.position.z !== position.z ||
      lastTransform.rotation.x !== rotation.x ||
      lastTransform.rotation.y !== rotation.y ||
      lastTransform.rotation.z !== rotation.z ||
      lastTransform.scale.x !== scale.x ||
      lastTransform.scale.y !== scale.y ||
      lastTransform.scale.z !== scale.z;

    // Always update matrix when transform changes or when pivot controls become active
    if (hasChanged && !isManipulatingRef.current) {
      const pos = new THREE.Vector3(position.x, position.y, position.z);
      const rot = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');
      const scl = new THREE.Vector3(scale.x, scale.y, scale.z);
      const quaternion = new THREE.Quaternion().setFromEuler(rot);
      
      matrixRef.current.compose(pos, quaternion, scl);
      lastTransformRef.current = { ...transform };
    }
  }, [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, scale.x, scale.y, scale.z, transform]);

  // Ensure matrix is properly initialized when pivot controls become active
  React.useLayoutEffect(() => {
    if (isSelected && editorMode !== "select" && !isManipulatingRef.current) {
      const pos = new THREE.Vector3(position.x, position.y, position.z);
      const rot = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');
      const scl = new THREE.Vector3(scale.x, scale.y, scale.z);
      const quaternion = new THREE.Quaternion().setFromEuler(rot);
      
      matrixRef.current.compose(pos, quaternion, scl);
    }
  }, [isSelected, editorMode, position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, scale.x, scale.y, scale.z]);

  // Hide helpers when physics is playing
  const shouldShowHelpers = isSelected && physicsState !== 'playing';

  if (!visible) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(obj.id);
  };

  // Check if this object has physics components
  const hasRigidBody = components.some(comp => comp.type === 'rigidBody' && comp.enabled);

  const handleDragStart = useCallback(() => {
    isManipulatingRef.current = true;
  }, []);

  const handleDrag = useCallback((local: THREE.Matrix4) => {
    // Update the matrix ref for smooth manipulation
    matrixRef.current.copy(local);
    
    // Extract transform components from the local matrix
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    local.decompose(position, quaternion, scale);
    
    // Convert quaternion to euler rotation with consistent rotation order
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
    
    // Update the object's transform
    updateObjectTransform(obj.id, {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      scale: { x: scale.x, y: scale.y, z: scale.z }
    });
  }, [obj.id, updateObjectTransform]);

  const handleDragEnd = useCallback(() => {
    isManipulatingRef.current = false;
  }, []);

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

  // Only apply transform to group if object doesn't have physics AND is not being controlled by PivotControls
  const isControlledByPivot = isSelected && editorMode !== "select";
  const groupProps = {
    ref: isSelected ? ref || groupRef : groupRef,
    onClick: handleClick,
    // Apply transforms to group only when:
    // 1. Object doesn't have a rigid body (non-physics objects need group transforms)
    // 2. Object is NOT being controlled by PivotControls (which handles transforms via matrix)
    // For physics objects with pivot controls active, treat like non-physics with pivot controls
    ...(!isControlledByPivot && !hasRigidBody && {
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
      {renderComponents(effectiveComponents, children, selectedObjects, onSelect, shouldShowHelpers, renderType, obj.id, isControlledByPivot ? {
        // When controlled by PivotControls, pass zeroed transform to avoid double positioning
        // PivotControls handles all positioning via matrix
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      } : transform, editorMode)}
    </group>
  );

  // Wrap selected objects with PivotControls when not in select mode
  if (isSelected && editorMode !== "select") {
    const controlSettings = getControlSettings();
    
    return (
      <PivotControls
        matrix={matrixRef.current}
        autoTransform={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
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
  objectId: string | undefined = undefined,
  transform: Transform | undefined = undefined,
  editorMode: string = "select"
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

  // Check if object is selected and pivot controls are active
  const isSelected = objectId ? selectedObjects.includes(objectId) : false;
  const isPivotControlsActive = isSelected && editorMode !== "select";

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

  // If there's a rigid body AND pivot controls are NOT active, wrap everything in RigidBodyRenderer
  if (rigidBodyComp && objectId && transform && !isPivotControlsActive) {
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

  // If pivot controls are active, don't render physics bodies to avoid conflicts
  // Just render the visual content directly
  if (isPivotControlsActive && rigidBodyComp) {
    // When pivot controls are active, render visual content without physics
    return visualContent;
  }

  // If no rigid body but has colliders, wrap visual content with colliders
  // (This case is for static colliders without rigid bodies)
  // Also skip colliders when pivot controls are active to avoid conflicts
  if (!isPivotControlsActive) {
    colliderComponents.forEach(colliderComponent => {
      visualContent = (
        <ColliderRenderer 
          colliderComponent={colliderComponent}
          transform={!rigidBodyComp ? transform : undefined}
        >
          {visualContent}
        </ColliderRenderer>
      );
    });
  }

  // TODO: Handle joints - they need references to connected bodies
  // This is more complex and might need to be handled at a higher level
  if (jointComponents.length > 0) {
    console.log(`Object ${objectId} has ${jointComponents.length} joint components - joint rendering not yet implemented`);
  }

  return visualContent;
} 