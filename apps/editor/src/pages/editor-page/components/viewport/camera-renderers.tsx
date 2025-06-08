import { Helper } from "@react-three/drei";
import React from "react";
import { CameraHelper } from "three/webgpu";

interface ComponentRendererProps {
  component: GameObjectComponent;
  children?: React.ReactNode;
  showHelpers?: boolean;
}

export function PerspectiveCameraRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const { fov = 75, near = 0.1, far = 1000 } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <perspectiveCamera fov={fov} near={near} far={far}>
      {showHelpers && (
        <Helper type={CameraHelper} args={[]} />
      )}
      {children}
    </perspectiveCamera>
  );
}

export function OrthographicCameraRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const {
    left = -10,
    right = 10,
    top = 10,
    bottom = -10,
    near = 0.1,
    far = 1000,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <orthographicCamera
      left={left}
      right={right}
      top={top}
      bottom={bottom}
      near={near}
      far={far}
    >
      {showHelpers && (
        <Helper type={CameraHelper} args={[]} />
      )}
      {children}
    </orthographicCamera>
  );
} 