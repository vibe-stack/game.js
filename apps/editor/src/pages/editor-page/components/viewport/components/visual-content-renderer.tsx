import React, { useMemo } from "react";
import { renderComponent } from "../component-renderers";
import { EmptyObjectHelper } from "../custom-helpers";
import SceneObject from "../scene-object-new";

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
  const childElements = useMemo(
    () =>
      children.map((child) => (
        <SceneObject
          key={child.id}
          objectId={child.id}
          selectedObjects={selectedObjects}
          onSelect={onSelect}
          renderType={renderType as any}
        />
      )),
    [children, selectedObjects, onSelect, renderType],
  );

  // Memoize enhanced components to prevent recalculation
  const enhancedComponents = useMemo(
    () =>
      components.map((component) => ({
        ...component,
        properties: {
          ...component.properties,
          renderType,
        },
      })),
    [components, renderType],
  );

  // Memoize visual content rendering
  const visualContent = useMemo(() => {
    const baseContent = enhancedComponents.reduce(
      (acc, component) => {
        return renderComponent(component, acc, showHelpers, objectId);
      },
      (<>{childElements}</>) as React.ReactElement,
    );

    // If there are no components and helpers should be shown, show empty object helper
    if (components.length === 0 && showHelpers) {
      return (
        <>
          <EmptyObjectHelper />
          {baseContent}
        </>
      );
    }

    return baseContent;
  }, [
    enhancedComponents,
    showHelpers,
    childElements,
    objectId,
    components.length,
  ]);

  return visualContent;
};

export default React.memo(VisualContentRenderer);
