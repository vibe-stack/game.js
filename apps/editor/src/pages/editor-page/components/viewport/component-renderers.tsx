import { Helper } from "@react-three/drei";
import React from "react";
import { CameraHelper, DirectionalLightHelper, PointLightHelper, SpotLightHelper, BoxHelper } from "three/webgpu";

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
}: ComponentRendererProps) {
  const { color = "#ffffff", intensity = 0.5 } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <ambientLight color={color} intensity={intensity}>
      {children}
    </ambientLight>
  );
}

export function HemisphereLightRenderer({
  component,
  children,
}: ComponentRendererProps) {
  const { 
    skyColor = "#ffffff", 
    groundColor = "#444444", 
    intensity = 0.6 
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  return (
    <hemisphereLight args={[skyColor, groundColor, intensity]}>
      {children}
    </hemisphereLight>
  );
}

export function RectAreaLightRenderer({
  component,
  children,
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
      {children}
    </rectAreaLight>
  );
}

export function MeshRenderer({ 
  component, 
  children, 
  showHelpers = false 
}: ComponentRendererProps) {
  const {
    geometry = "box",
    material = "standard",
    materialProps = {},
    geometryProps = {},
    castShadow = false,
    receiveShadow = false,
  } = component.properties;

  if (!component.enabled) return <>{children}</>;

  const GeometryComponent = getGeometryComponent(geometry);
  const MaterialComponent = getMaterialComponent(material);

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
      <GeometryComponent {...geometryProps} />
      <MaterialComponent {...materialProps} />
      {showHelpers && (
        <Helper type={BoxHelper} args={[0xffff00]} />
      )}
      {children}
    </mesh>
  );
}

function getGeometryComponent(type: string) {
  switch (type) {
    case "box":
      return ({ 
        width = 1, 
        height = 1, 
        depth = 1, 
        widthSegments = 1,
        heightSegments = 1,
        depthSegments = 1,
        ...props 
      }) => (
        <boxGeometry args={[width, height, depth, widthSegments, heightSegments, depthSegments]} {...props} />
      );
    case "sphere":
      return ({
        radius = 1,
        widthSegments = 32,
        heightSegments = 16,
        phiStart = 0,
        phiLength = Math.PI * 2,
        thetaStart = 0,
        thetaLength = Math.PI,
        ...props
      }) => (
        <sphereGeometry
          args={[radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength]}
          {...props}
        />
      );
    case "plane":
      return ({
        width = 1,
        height = 1,
        widthSegments = 1,
        heightSegments = 1,
        ...props
      }) => (
        <planeGeometry
          args={[width, height, widthSegments, heightSegments]}
          {...props}
        />
      );
    case "cylinder":
      return ({
        radiusTop = 1,
        radiusBottom = 1,
        height = 1,
        radialSegments = 32,
        heightSegments = 1,
        openEnded = false,
        thetaStart = 0,
        thetaLength = Math.PI * 2,
        ...props
      }) => (
        <cylinderGeometry
          args={[radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength]}
          {...props}
        />
      );
    case "cone":
      return ({ 
        radius = 1, 
        height = 1, 
        radialSegments = 32,
        heightSegments = 1,
        openEnded = false,
        thetaStart = 0,
        thetaLength = Math.PI * 2,
        ...props 
      }) => (
        <coneGeometry args={[radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength]} {...props} />
      );
    case "torus":
      return ({
        radius = 1,
        tube = 0.4,
        radialSegments = 16,
        tubularSegments = 100,
        arc = Math.PI * 2,
        ...props
      }) => (
        <torusGeometry
          args={[radius, tube, radialSegments, tubularSegments, arc]}
          {...props}
        />
      );
    case "torusKnot":
      return ({
        radius = 1,
        tube = 0.4,
        tubularSegments = 64,
        radialSegments = 8,
        p = 2,
        q = 3,
        ...props
      }) => (
        <torusKnotGeometry
          args={[radius, tube, tubularSegments, radialSegments, p, q]}
          {...props}
        />
      );
    case "capsule":
      return ({
        radius = 1,
        length = 1,
        capSegments = 4,
        radialSegments = 8,
        ...props
      }) => (
        <capsuleGeometry
          args={[radius, length, capSegments, radialSegments]}
          {...props}
        />
      );
    case "circle":
      return ({
        radius = 1,
        segments = 32,
        thetaStart = 0,
        thetaLength = Math.PI * 2,
        ...props
      }) => (
        <circleGeometry
          args={[radius, segments, thetaStart, thetaLength]}
          {...props}
        />
      );
    case "ring":
      return ({
        innerRadius = 0.5,
        outerRadius = 1,
        thetaSegments = 32,
        phiSegments = 1,
        thetaStart = 0,
        thetaLength = Math.PI * 2,
        ...props
      }) => (
        <ringGeometry
          args={[innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength]}
          {...props}
        />
      );
    case "dodecahedron":
      return ({
        radius = 1,
        detail = 0,
        ...props
      }) => (
        <dodecahedronGeometry
          args={[radius, detail]}
          {...props}
        />
      );
    case "icosahedron":
      return ({
        radius = 1,
        detail = 0,
        ...props
      }) => (
        <icosahedronGeometry
          args={[radius, detail]}
          {...props}
        />
      );
    case "octahedron":
      return ({
        radius = 1,
        detail = 0,
        ...props
      }) => (
        <octahedronGeometry
          args={[radius, detail]}
          {...props}
        />
      );
    case "tetrahedron":
      return ({
        radius = 1,
        detail = 0,
        ...props
      }) => (
        <tetrahedronGeometry
          args={[radius, detail]}
          {...props}
        />
      );
    default:
      return ({ ...props }) => <boxGeometry args={[1, 1, 1]} {...props} />;
  }
}

function getMaterialComponent(type: string) {
  switch (type) {
    case "standard":
      return ({
        color = "#orange",
        metalness = 0,
        roughness = 1,
        ...props
      }) => (
        <meshStandardMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          {...props}
        />
      );
    case "basic":
      return ({ color = "#orange", ...props }) => (
        <meshBasicMaterial color={color} {...props} />
      );
    case "phong":
      return ({ color = "#orange", shininess = 100, ...props }) => (
        <meshPhongMaterial color={color} shininess={shininess} {...props} />
      );
    case "lambert":
      return ({ color = "#orange", ...props }) => (
        <meshLambertMaterial color={color} {...props} />
      );
    case "physical":
      return ({
        color = "#orange",
        metalness = 0,
        roughness = 1,
        ...props
      }) => (
        <meshPhysicalMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          {...props}
        />
      );
    default:
      return ({ color = "#orange", ...props }) => (
        <meshStandardMaterial color={color} {...props} />
      );
  }
}

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
