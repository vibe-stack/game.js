import React from "react";
import MeshComponent from "./component-renderers/mesh-component";
import LightComponent from "./component-renderers/light-component";
import CameraComponent from "./component-renderers/camera-component";
import RigidBodyComponent from "./component-renderers/rigid-body-component";
import ColliderComponent from "./component-renderers/collider-component";
import AddComponentMenu from "./add-component-menu";
import CollapsibleSection from "./collapsible-section";
import CustomToggle from "./custom-toggle";

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

    const getComponentTitle = (comp: GameObjectComponent | PhysicsComponent) => {
      switch (comp.type) {
        case 'Mesh': return 'Mesh Renderer';
        case 'DirectionalLight': return 'Directional Light';
        case 'PointLight': return 'Point Light';
        case 'SpotLight': return 'Spot Light';
        case 'AmbientLight': return 'Ambient Light';
        case 'HemisphereLight': return 'Hemisphere Light';
        case 'RectAreaLight': return 'Rect Area Light';
        case 'PerspectiveCamera': return 'Perspective Camera';
        case 'OrthographicCamera': return 'Orthographic Camera';
        case 'rigidBody': return 'Rigid Body';
        case 'collider': return 'Collider';
        case 'joint': return 'Joint';
        default: return comp.type;
      }
    };

    const renderComponentContent = () => {
      switch (component.type) {
        case 'Mesh':
          return <MeshComponent {...meshProps} component={component as GameObjectComponent} />;
        case 'DirectionalLight':
        case 'PointLight':
        case 'SpotLight':
        case 'AmbientLight':
        case 'HemisphereLight':
        case 'RectAreaLight':
          return <LightComponent {...commonProps} component={component as GameObjectComponent} />;
        case 'PerspectiveCamera':
        case 'OrthographicCamera':
          return <CameraComponent {...commonProps} component={component as GameObjectComponent} />;
        case 'rigidBody':
          return <RigidBodyComponent {...commonProps} component={component as RigidBodyComponent} />;
        case 'collider':
          return <ColliderComponent {...commonProps} component={component as ColliderComponent} />;
        case 'joint':
          return (
            <div className="text-xs text-muted-foreground">
              Joint component renderer coming soon
            </div>
          );
        default:
          return (
            <div className="text-xs text-muted-foreground">
              Component type not implemented yet
            </div>
          );
      }
    };

    return (
      <CollapsibleSection 
        key={component.id}
        title={getComponentTitle(component)}
        storageKey={`component-${component.type}-${component.id}`}
        defaultOpen={false}
        rightElement={
          <CustomToggle
            checked={component.enabled}
            onCheckedChange={(enabled) => onUpdate(component.id, { enabled })}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        {renderComponentContent()}
      </CollapsibleSection>
    );
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between px-1 pb-3">
        <AddComponentMenu onAddComponent={onAddComponent} />
      </div>
      
      {components.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4">
          No components attached
        </div>
      ) : (
        <div>
          {components.map(renderComponent)}
        </div>
      )}
    </div>
  );
} 