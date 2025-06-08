import React, { useRef, forwardRef } from "react";
import { PivotControls } from "@react-three/drei";
import { renderComponent } from "./component-renderers";
import useEditorStore from "@/stores/editor-store";
import * as THREE from "three";

interface SceneObjectProps {
  obj: GameObject;
  selectedObjects: string[];
  onSelect: (id: string) => void;
}

const SceneObject = forwardRef<THREE.Group, SceneObjectProps>(({ obj, selectedObjects, onSelect }, ref) => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTransformChange = (local: THREE.Matrix4, deltaLocal: THREE.Matrix4, world: THREE.Matrix4, deltaWorld: THREE.Matrix4) => {
    // Extract position, rotation, and scale from the local matrix
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    local.decompose(position, quaternion, scale);
    
    // Convert quaternion to euler rotation
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    
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

  const groupProps = {
    ref: isSelected ? ref || groupRef : groupRef,
    position: [position.x, position.y, position.z] as [number, number, number],
    rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
    scale: [scale.x, scale.y, scale.z] as [number, number, number],
    onClick: handleClick,
  };

  const effectiveComponents = components.length > 0 
    ? components 
    : [createDefaultMeshComponent(isSelected)];

  const groupContent = (
    <group {...groupProps}>
      {renderComponents(effectiveComponents, children, selectedObjects, onSelect, isSelected)}
    </group>
  );

  // Wrap selected objects with PivotControls when not in select mode
  if (isSelected && editorMode !== "select") {
    const controlSettings = getControlSettings();
    
    return (
      <PivotControls
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

function createDefaultMeshComponent(isSelected: boolean): GameObjectComponent {
  return {
    id: 'default-mesh',
    type: 'Mesh',
    enabled: true,
    properties: {
      geometry: 'box',
      material: 'standard',
      geometryProps: { width: 1, height: 1, depth: 1 },
      materialProps: { 
        color: isSelected ? '#ffff00' : '#ffa500',
        wireframe: isSelected 
      },
      castShadow: true,
      receiveShadow: true
    }
  };
}

function renderComponents(
  components: GameObjectComponent[], 
  children: GameObject[], 
  selectedObjects: string[],
  onSelect: (id: string) => void,
  showHelpers: boolean = false
): React.ReactElement {
  const childElements = children.map((child) => (
    <SceneObject
      key={child.id}
      obj={child}
      selectedObjects={selectedObjects}
      onSelect={onSelect}
    />
  ));

  return components.reduce((acc, component) => {
    return renderComponent(component, acc, showHelpers);
  }, <>{childElements}</> as React.ReactElement);
} 