import React from "react";
import { PerspectiveCameraRenderer, OrthographicCameraRenderer } from "./camera-renderers";
import { 
  DirectionalLightRenderer, 
  PointLightRenderer, 
  SpotLightRenderer, 
  AmbientLightRenderer, 
  HemisphereLightRenderer, 
  RectAreaLightRenderer 
} from "./light-renderers";
import { MeshRenderer } from "./mesh-renderer";
import HeightfieldRenderer from "./heightfield-renderer";
import ExtrudedArcRenderer from "./extruded-arc-renderer";
import { ScriptRenderer } from "./script-renderer";

export const COMPONENT_RENDERERS = {
  PerspectiveCamera: PerspectiveCameraRenderer,
  OrthographicCamera: OrthographicCameraRenderer,
  DirectionalLight: DirectionalLightRenderer,
  PointLight: PointLightRenderer,
  SpotLight: SpotLightRenderer,
  AmbientLight: AmbientLightRenderer,
  HemisphereLight: HemisphereLightRenderer,
  RectAreaLight: RectAreaLightRenderer,
  Mesh: MeshRenderer,
  heightfield: HeightfieldRenderer,
  extrudedArc: ExtrudedArcRenderer,
  script: ScriptRenderer,
};

export function renderComponent(
  component: GameObjectComponent | PhysicsComponent,
  children?: React.ReactNode,
  showHelpers?: boolean,
  objectId?: string,
) {
  // Type-safe rendering based on component type
  switch (component.type) {
    case 'PerspectiveCamera':
      return <PerspectiveCameraRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</PerspectiveCameraRenderer>;
    case 'OrthographicCamera':
      return <OrthographicCameraRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</OrthographicCameraRenderer>;
    case 'DirectionalLight':
      return <DirectionalLightRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</DirectionalLightRenderer>;
    case 'PointLight':
      return <PointLightRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</PointLightRenderer>;
    case 'SpotLight':
      return <SpotLightRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</SpotLightRenderer>;
    case 'AmbientLight':
      return <AmbientLightRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</AmbientLightRenderer>;
    case 'HemisphereLight':
      return <HemisphereLightRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</HemisphereLightRenderer>;
    case 'RectAreaLight':
      return <RectAreaLightRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</RectAreaLightRenderer>;
    case 'Mesh':
      return <MeshRenderer component={component as GameObjectComponent} showHelpers={showHelpers}>{children}</MeshRenderer>;
    case 'heightfield':
      return <HeightfieldRenderer component={component as HeightfieldComponent} objectId={objectId}>{children}</HeightfieldRenderer>;
    case 'extrudedArc':
      return <ExtrudedArcRenderer component={component as ExtrudedArcComponent}>{children}</ExtrudedArcRenderer>;
    case 'script':
      return <ScriptRenderer component={component as ScriptComponent} showHelpers={showHelpers} objectId={objectId}>{children}</ScriptRenderer>;
    default:
      console.warn(`No renderer found for component type: ${component.type}`);
      return <>{children}</>;
  }
}

export * from "./camera-renderers";
export * from "./light-renderers";
export * from "./mesh-renderer";
export * from "./geometry-components";
export * from "./material-components";
export * from "./custom-helpers";
export * from "./script-renderer";
