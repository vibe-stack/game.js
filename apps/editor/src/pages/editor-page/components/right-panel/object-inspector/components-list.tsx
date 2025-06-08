import React from "react";
import MeshComponent from "./component-renderers/mesh-component";
import LightComponent from "./component-renderers/light-component";
import CameraComponent from "./component-renderers/camera-component";

interface ComponentsListProps {
  components: GameObjectComponent[];
  onUpdate: (componentId: string, updates: Partial<GameObjectComponent>) => void;
}

export default function ComponentsList({ components, onUpdate }: ComponentsListProps) {
  if (components.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border-b border-muted pb-2">
          <h4 className="text-sm font-medium text-muted-foreground">Components</h4>
        </div>
        <div className="text-xs text-muted-foreground text-center py-4">
          No components attached
        </div>
      </div>
    );
  }

  const renderComponent = (component: GameObjectComponent) => {
    const commonProps = {
      component,
      onUpdate: (updates: Partial<GameObjectComponent>) => onUpdate(component.id, updates)
    };

    switch (component.type) {
      case 'Mesh':
        return <MeshComponent key={component.id} {...commonProps} />;
      case 'DirectionalLight':
      case 'PointLight':
      case 'SpotLight':
      case 'AmbientLight':
      case 'HemisphereLight':
      case 'RectAreaLight':
        return <LightComponent key={component.id} {...commonProps} />;
      case 'PerspectiveCamera':
      case 'OrthographicCamera':
        return <CameraComponent key={component.id} {...commonProps} />;
      default:
        return (
          <div key={component.id} className="p-3 border border-muted rounded-md">
            <div className="text-sm font-medium mb-2">{component.type}</div>
            <div className="text-xs text-muted-foreground">
              Component type not implemented yet
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-0">
      <div className="border-b border-muted pb-0">
        <h4 className="text-sm font-medium text-muted-foreground">Components</h4>
      </div>
      
      <div className="space-y-1">
        {components.map(renderComponent)}
      </div>
    </div>
  );
} 