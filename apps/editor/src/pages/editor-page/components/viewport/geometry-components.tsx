export function getGeometryComponent(type: string) {
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