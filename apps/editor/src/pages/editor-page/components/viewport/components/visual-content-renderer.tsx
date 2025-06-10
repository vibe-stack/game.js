import React, { useMemo } from "react";
import { renderComponent } from "../component-renderers";
import SceneObject from "../scene-object";

interface VisualContentRendererProps {
  components: GameObjectComponent[];
  children: GameObject[];
  selectedObjects: string[];
  onSelect: (id: string) => void;
  showHelpers: boolean;
  renderType: string;
  objectId?: string;
}

const VisualContentRenderer: React.FC<VisualContentRendererProps> = ({
  components,
  children,
  selectedObjects,
  onSelect,
  showHelpers,
  renderType,
  objectId,
}) => {
  // Memoize child elements to prevent unnecessary re-renders
  const childElements = useMemo(() => 
    children.map((child) => (
      <SceneObject
        key={child.id}
        obj={child}
        selectedObjects={selectedObjects}
        onSelect={onSelect}
        renderType={renderType as any}
      />
    )), 
    [children, selectedObjects, onSelect, renderType]
  );

  // Memoize enhanced components to prevent recalculation
  const enhancedComponents = useMemo(() => 
    components.map(component => ({
      ...component,
      properties: {
        ...component.properties,
        renderType
      }
    })), 
    [components, renderType]
  );

  // Memoize visual content rendering
  const visualContent = useMemo(() => {
    return enhancedComponents.reduce((acc, component) => {
      return renderComponent(component, acc, showHelpers, objectId);
    }, <>{childElements}</> as React.ReactElement);
  }, [enhancedComponents, showHelpers, childElements, objectId]);

  return visualContent;
};

export default React.memo(VisualContentRenderer); 