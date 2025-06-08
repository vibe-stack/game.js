import React from "react";
import { renderComponent } from "./component-renderers";

interface SceneObjectProps {
  obj: GameObject;
  selectedObjects: string[];
  onSelect: (id: string) => void;
}

export default function SceneObject({ obj, selectedObjects, onSelect }: SceneObjectProps) {
  const { transform, components, children, visible } = obj;
  const { position, rotation, scale } = transform;
  const isSelected = selectedObjects.includes(obj.id);

  if (!visible) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(obj.id);
  };

  const groupProps = {
    position: [position.x, position.y, position.z] as [number, number, number],
    rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
    scale: [scale.x, scale.y, scale.z] as [number, number, number],
    onClick: handleClick,
  };

  const effectiveComponents = components.length > 0 
    ? components 
    : [createDefaultMeshComponent(isSelected)];

  return (
    <group {...groupProps}>
      {renderComponents(effectiveComponents, children, selectedObjects, onSelect, isSelected)}
    </group>
  );
}

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