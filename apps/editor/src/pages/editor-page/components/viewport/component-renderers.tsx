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
};

export function renderComponent(
  component: GameObjectComponent,
  children?: React.ReactNode,
  showHelpers?: boolean,
) {
  const Renderer =
    COMPONENT_RENDERERS[component.type as keyof typeof COMPONENT_RENDERERS];

  if (!Renderer) {
    console.warn(`No renderer found for component type: ${component.type}`);
    return <>{children}</>;
  }

  return <Renderer component={component} showHelpers={showHelpers}>{children}</Renderer>;
}

export * from "./camera-renderers";
export * from "./light-renderers";
export * from "./mesh-renderer";
export * from "./geometry-components";
export * from "./material-components";
export * from "./custom-helpers";
