import { Helper } from "@react-three/drei";
import React from "react";
import { DirectionalLightHelper, PointLightHelper, SpotLightHelper } from "three/webgpu";
import { RectAreaLightHelper, AmbientLightHelper, HemisphereLightHelper } from "./custom-helpers";

interface ComponentRendererProps {
  component: GameObjectComponent;
  children?: React.ReactNode;
  showHelpers?: boolean;
}

export function DirectionalLightRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const {
    color = "#ffffff",
    intensity = 1,
    castShadow = false,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <directionalLight
      color={color}
      intensity={intensity}
      castShadow={castShadow}
    >
      {showHelpers && (
        <Helper type={DirectionalLightHelper} args={[intensity, "#00ff00"]} />
      )}
      {children}
    </directionalLight>
  );
}

export function PointLightRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const {
    color = "#ffffff",
    intensity = 1,
    distance = 0,
    decay = 2,
    castShadow = false,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <pointLight
      color={color}
      intensity={intensity}
      distance={distance}
      decay={decay}
      castShadow={castShadow}
    >
      {showHelpers && (
        <Helper type={PointLightHelper} args={[intensity, "#00ff00"]} />
      )}
      {children}
    </pointLight>
  );
}

export function SpotLightRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const {
    color = "#ffffff",
    intensity = 1,
    distance = 0,
    angle = Math.PI / 3,
    penumbra = 0,
    decay = 2,
    castShadow = false,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <spotLight
      color={color}
      intensity={intensity}
      distance={distance}
      angle={angle}
      penumbra={penumbra}
      decay={decay}
      castShadow={castShadow}
    >
      {showHelpers && (
        <Helper type={SpotLightHelper} args={[]} />
      )}
      {children}
    </spotLight>
  );
}

export function AmbientLightRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const { color = "#ffffff", intensity = 0.5 } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <ambientLight color={color} intensity={intensity}>
      {showHelpers && (
        <AmbientLightHelper size={2} color={color} />
      )}
      {children}
    </ambientLight>
  );
}

export function HemisphereLightRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const { 
    skyColor = "#ffffff", 
    groundColor = "#444444", 
    intensity = 0.6 
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <hemisphereLight args={[skyColor, groundColor, intensity]}>
      {showHelpers && (
        <HemisphereLightHelper size={2} skyColor={skyColor} groundColor={groundColor} />
      )}
      {children}
    </hemisphereLight>
  );
}

export function RectAreaLightRenderer({
  component,
  children,
  showHelpers = false,
}: ComponentRendererProps) {
  const {
    color = "#ffffff",
    intensity = 1,
    width = 10,
    height = 10,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <rectAreaLight
      color={color}
      intensity={intensity}
      width={width}
      height={height}
    >
      {showHelpers && (
        <RectAreaLightHelper width={width} height={height} color={color} />
      )}
      {children}
    </rectAreaLight>
  );
} 