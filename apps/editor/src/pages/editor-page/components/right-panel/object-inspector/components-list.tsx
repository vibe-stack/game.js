import React from "react";
import MeshComponent from "./component-renderers/mesh-component";
import LightComponent from "./component-renderers/light-component";
import CameraComponent from "./component-renderers/camera-component";
import RigidBodyComponent from "./component-renderers/rigid-body-component";
import ColliderComponent from "./component-renderers/collider-component";
import AddComponentMenu from "./add-component-menu";

interface ComponentsListProps {
  components: (GameObjectComponent | PhysicsComponent)[];
  objectId: string;
  onUpdate: (componentId: string, updates: Partial<GameObjectComponent | PhysicsComponent>) => void;
  onAddComponent: (component: GameObjectComponent | PhysicsComponent) => void;
}

export default function ComponentsList({ components, objectId, onUpdate, onAddComponent }: ComponentsListProps) {
  const renderComponent = (component: GameObjectComponent | PhysicsComponent) => {
    const commonProps = {
      component,
      onUpdate: (updates: Partial<GameObjectComponent | PhysicsComponent>) => onUpdate(component.id, updates)
    };

    const meshProps = {
      component,
      objectId,
      onUpdate: (updates: Partial<GameObjectComponent | PhysicsComponent>) => onUpdate(component.id, updates)
    };

    switch (component.type) {
      case 'Mesh':
        return <MeshComponent key={component.id} {...meshProps} component={component as GameObjectComponent} />;
      case 'DirectionalLight':
      case 'PointLight':
      case 'SpotLight':
      case 'AmbientLight':
      case 'HemisphereLight':
      case 'RectAreaLight':
        return <LightComponent key={component.id} {...commonProps} component={component as GameObjectComponent} />;
      case 'PerspectiveCamera':
      case 'OrthographicCamera':
        return <CameraComponent key={component.id} {...commonProps} component={component as GameObjectComponent} />;
      case 'rigidBody':
        return <RigidBodyComponent key={component.id} {...commonProps} component={component as RigidBodyComponent} />;
      case 'collider':
        return <ColliderComponent key={component.id} {...commonProps} component={component as ColliderComponent} />;
      case 'joint':
        return (
          <div key={component.id} className="p-3 border border-muted rounded-md">
            <div className="text-sm font-medium mb-2">Joint</div>
            <div className="text-xs text-muted-foreground">
              Joint component renderer coming soon
            </div>
          </div>
        );
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
    <div className="">
      <div className="border-b pb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Components</h4>
        <AddComponentMenu onAddComponent={onAddComponent} />
      </div>
      
      {components.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4">
          No components attached
        </div>
      ) : (
        <div className="space-y-1">
          {components.map(renderComponent)}
        </div>
      )}
    </div>
  );
} 