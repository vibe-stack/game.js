import React, { useRef, forwardRef, useMemo } from "react";
import { PivotControls } from "@react-three/drei";
import { renderComponent } from "./component-renderers";
import useEditorStore from "@/stores/editor-store";
import * as THREE from "three";

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
    onClick: handleClick,
    // Only apply transforms when PivotControls are not active
    ...(!(isSelected && editorMode !== "select") && {
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
      {renderComponents(effectiveComponents, children, selectedObjects, onSelect, isSelected, renderType)}
    </group>
  );

  // Wrap selected objects with PivotControls when not in select mode
  if (isSelected && editorMode !== "select") {
    const controlSettings = getControlSettings();
    
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
  components: GameObjectComponent[], 
  children: GameObject[], 
  selectedObjects: string[],
  onSelect: (id: string) => void,
  showHelpers: boolean = false,
  renderType: string = "solid"
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

  return components.reduce((acc, component) => {
    const enhancedComponent = {
      ...component,
      properties: {
        ...component.properties,
        renderType
      }
    };
    return renderComponent(enhancedComponent, acc, showHelpers);
  }, <>{childElements}</> as React.ReactElement);
} 