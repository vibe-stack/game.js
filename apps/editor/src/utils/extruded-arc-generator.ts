import * as THREE from "three";

// Use global type from types.d.ts
type ExtrudedArcProps = ExtrudedArcComponent["properties"];

/**
 * Generates extruded arc mesh geometry with proper vertex, face, normal, and UV data
 * Creates a clean, continuous mesh without artifacts
 */
export function generateExtrudedArcGeometry(
  props: ExtrudedArcProps,
): THREE.BufferGeometry {
  const {
    arcRadius,
    pitch,
    width,
    height,
    angle,
    segments,
    closed,
    crossSectionSegments,
    extrusionSegments,
    uvScale,
    flipUVs,
  } = props;

  const geometry = new THREE.BufferGeometry();

  // Calculate the number of points along the path
  const pathSegments = Math.max(3, Math.floor(segments));
  const crossSegs = Math.max(1, Math.floor(crossSectionSegments));
  const extrudeSegs = Math.max(1, Math.floor(extrusionSegments));

  // Determine if we should close the path
  const shouldClose = closed || (Math.abs(angle) >= Math.PI * 2 - 0.01);
  const totalPathPoints = shouldClose ? pathSegments : pathSegments + 1;

  // Arrays to hold geometry data
  const vertices: number[] = [];
  const faces: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // Generate vertices
  for (let pathIdx = 0; pathIdx < totalPathPoints; pathIdx++) {
    // Handle wrap-around for closed paths
    const t = shouldClose && pathIdx === pathSegments ? 0 : pathIdx / pathSegments;
    
    // Calculate position along path
    const currentAngle = angle * t;
    const currentPitch = pitch * t;

    // Center position on the path
    const centerX = arcRadius * Math.cos(currentAngle);
    const centerZ = arcRadius * Math.sin(currentAngle);
    const centerY = currentPitch;

    // Calculate tangent vector (direction of the path)
    const tangentX = -Math.sin(currentAngle);
    const tangentZ = Math.cos(currentAngle);
    const tangentY = pitch / angle; // Derivative of pitch with respect to angle

    // Normalize tangent
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);
    const normalizedTangentX = tangentX / tangentLength;
    const normalizedTangentY = tangentY / tangentLength;
    const normalizedTangentZ = tangentZ / tangentLength;

    // Calculate path normal (pointing outward from arc center)
    const pathNormalX = Math.cos(currentAngle);
    const pathNormalZ = Math.sin(currentAngle);
    const pathNormalY = 0;

    // Calculate binormal (cross product of tangent and path normal)
    const binormalX = normalizedTangentY * pathNormalZ - normalizedTangentZ * pathNormalY;
    const binormalY = normalizedTangentZ * pathNormalX - normalizedTangentX * pathNormalZ;
    const binormalZ = normalizedTangentX * pathNormalY - normalizedTangentY * pathNormalX;

    // Generate cross-section vertices (width direction)
    for (let crossIdx = 0; crossIdx <= crossSegs; crossIdx++) {
      const crossT = (crossIdx / crossSegs) - 0.5; // -0.5 to 0.5
      const offsetDistance = width * crossT;

      // Generate extrusion vertices (height direction)
      for (let extrudeIdx = 0; extrudeIdx <= extrudeSegs; extrudeIdx++) {
        const extrudeT = extrudeIdx / extrudeSegs; // 0 to 1
        const currentHeight = height * extrudeT;

        // Calculate final vertex position using proper cross-section coordinates
        const vertexX = centerX + pathNormalX * offsetDistance + binormalX * currentHeight;
        const vertexY = centerY + binormalY * currentHeight;
        const vertexZ = centerZ + pathNormalZ * offsetDistance + binormalZ * currentHeight;

        vertices.push(vertexX, vertexY, vertexZ);

        // Calculate vertex normal based on position
        let normalX = 0, normalY = 0, normalZ = 0;

        if (extrudeIdx === 0) {
          // Bottom face - normal points down
          normalX = -binormalX; normalY = -binormalY; normalZ = -binormalZ;
        } else if (extrudeIdx === extrudeSegs) {
          // Top face - normal points up
          normalX = binormalX; normalY = binormalY; normalZ = binormalZ;
        } else {
          // Side faces
          if (crossIdx === 0) {
            // Inner side face - normal points inward
            normalX = -pathNormalX; normalY = -pathNormalY; normalZ = -pathNormalZ;
          } else if (crossIdx === crossSegs) {
            // Outer side face - normal points outward
            normalX = pathNormalX; normalY = pathNormalY; normalZ = pathNormalZ;
          } else {
            // Main surface - interpolate normal
            const innerWeight = 1 - (crossIdx / crossSegs);
            const outerWeight = crossIdx / crossSegs;
            normalX = innerWeight * (-pathNormalX) + outerWeight * pathNormalX;
            normalY = innerWeight * (-pathNormalY) + outerWeight * pathNormalY;
            normalZ = innerWeight * (-pathNormalZ) + outerWeight * pathNormalZ;
          }
        }

        normals.push(normalX, normalY, normalZ);

        // Calculate UV coordinates based on path length and cross-section
        const pathProgress = pathIdx / Math.max(1, totalPathPoints - (shouldClose ? 0 : 1));
        const uCoord = pathProgress * uvScale.x;
        const vCoord = flipUVs ? 
          1 - ((extrudeT + crossT * 0.5) * uvScale.y) :
          (extrudeT + crossT * 0.5) * uvScale.y;

        uvs.push(uCoord, vCoord);
      }
    }
  }

  // Generate faces
  const verticesPerCrossSection = (crossSegs + 1) * (extrudeSegs + 1);
  const pathCount = shouldClose ? pathSegments : pathSegments;

  for (let pathIdx = 0; pathIdx < pathCount; pathIdx++) {
    const currentBase = pathIdx * verticesPerCrossSection;
    const nextPathIdx = shouldClose && pathIdx === pathSegments - 1 ? 0 : pathIdx + 1;
    const nextBase = nextPathIdx * verticesPerCrossSection;

    for (let crossIdx = 0; crossIdx < crossSegs; crossIdx++) {
      for (let extrudeIdx = 0; extrudeIdx < extrudeSegs; extrudeIdx++) {
        // Calculate vertex indices for current quad
        const bottomLeft = currentBase + crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const bottomRight = currentBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const topLeft = currentBase + crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const topRight = currentBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // Calculate corresponding vertices on next path segment
        const nextBottomLeft = nextBase + crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const nextBottomRight = nextBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const nextTopLeft = nextBase + crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const nextTopRight = nextBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // Main surface quads
        if (extrudeIdx > 0 && extrudeIdx < extrudeSegs && crossIdx > 0 && crossIdx < crossSegs) {
          // Main surface faces (proper winding)
          faces.push(bottomLeft, nextBottomLeft, topLeft);
          faces.push(nextBottomLeft, nextTopLeft, topLeft);
          
          faces.push(bottomRight, topRight, nextBottomRight);
          faces.push(topRight, nextTopRight, nextBottomRight);
        }

        // Bottom face
        if (extrudeIdx === 0) {
          faces.push(bottomLeft, bottomRight, nextBottomLeft);
          faces.push(bottomRight, nextBottomRight, nextBottomLeft);
        }

        // Top face  
        if (extrudeIdx === extrudeSegs - 1) {
          faces.push(topLeft, nextTopLeft, topRight);
          faces.push(nextTopLeft, nextTopRight, topRight);
        }

        // Inner side face
        if (crossIdx === 0) {
          faces.push(bottomLeft, topLeft, nextBottomLeft);
          faces.push(topLeft, nextTopLeft, nextBottomLeft);
        }
        
        // Outer side face
        if (crossIdx === crossSegs - 1) {
          faces.push(bottomRight, nextBottomRight, topRight);
          faces.push(nextBottomRight, nextTopRight, topRight);
        }
      }
    }
  }

  // Create end caps for non-closed paths
  if (!shouldClose) {
    // Start cap
    for (let crossIdx = 0; crossIdx < crossSegs; crossIdx++) {
      for (let extrudeIdx = 0; extrudeIdx < extrudeSegs; extrudeIdx++) {
        const v1 = crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const v2 = (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const v3 = crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const v4 = (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // Start cap faces (facing backward)
        faces.push(v1, v3, v2);
        faces.push(v2, v3, v4);
      }
    }

    // End cap
    const endBase = pathSegments * verticesPerCrossSection;
    for (let crossIdx = 0; crossIdx < crossSegs; crossIdx++) {
      for (let extrudeIdx = 0; extrudeIdx < extrudeSegs; extrudeIdx++) {
        const v1 = endBase + crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const v2 = endBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const v3 = endBase + crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const v4 = endBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // End cap faces (facing forward)
        faces.push(v1, v2, v3);
        faces.push(v2, v4, v3);
      }
    }
  }

  // Set geometry attributes
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(faces);

  // Compute vertex normals for smooth shading
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Generates vertices for physics collider (convex hull)
 * Returns a simplified set of vertices that represent the key points of the extruded arc
 */
export function generateExtrudedArcColliderVertices(
  props: ExtrudedArcProps,
): THREE.Vector3[] {
  const {
    arcRadius,
    pitch,
    width,
    height,
    angle,
    segments,
    closed,
    crossSectionSegments,
    extrusionSegments,
  } = props;

  const vertices: THREE.Vector3[] = [];
  const pathSegments = Math.max(3, Math.floor(segments));
  const crossSegs = Math.max(1, Math.floor(crossSectionSegments));
  const extrudeSegs = Math.max(1, Math.floor(extrusionSegments));
  const shouldClose = closed || (Math.abs(angle) >= Math.PI * 2 - 0.01);
  const totalPathPoints = shouldClose ? pathSegments : pathSegments + 1;

  // Generate vertices for the convex hull
  for (let pathIdx = 0; pathIdx < totalPathPoints; pathIdx++) {
    const t = shouldClose && pathIdx === pathSegments ? 0 : pathIdx / pathSegments;
    const currentAngle = angle * t;
    const currentPitch = pitch * t;

    // Center position on the path
    const centerX = arcRadius * Math.cos(currentAngle);
    const centerZ = arcRadius * Math.sin(currentAngle);
    const centerY = currentPitch;

    // Calculate tangent vector
    const tangentX = -Math.sin(currentAngle);
    const tangentZ = Math.cos(currentAngle);
    const tangentY = pitch / angle;

    // Normalize tangent
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);
    const normalizedTangentX = tangentX / tangentLength;
    const normalizedTangentY = tangentY / tangentLength;
    const normalizedTangentZ = tangentZ / tangentLength;

    // Path normal (radial direction)
    const pathNormalX = Math.cos(currentAngle);
    const pathNormalZ = Math.sin(currentAngle);
    const pathNormalY = 0;

    // Binormal (cross product of tangent and path normal)
    const binormalX = normalizedTangentY * pathNormalZ - normalizedTangentZ * pathNormalY;
    const binormalY = normalizedTangentZ * pathNormalX - normalizedTangentX * pathNormalZ;
    const binormalZ = normalizedTangentX * pathNormalY - normalizedTangentY * pathNormalX;

    // Generate cross-section vertices (width direction)
    for (let crossIdx = 0; crossIdx <= crossSegs; crossIdx++) {
      const crossT = (crossIdx / crossSegs) - 0.5; // -0.5 to 0.5
      const offsetDistance = width * crossT;

      // Generate extrusion vertices (height direction)
      for (let extrudeIdx = 0; extrudeIdx <= extrudeSegs; extrudeIdx++) {
        const extrudeT = extrudeIdx / extrudeSegs; // 0 to 1
        const currentHeight = height * extrudeT;

        // Calculate vertex position with proper orientation
        const vertexX = centerX + pathNormalX * offsetDistance + binormalX * currentHeight;
        const vertexY = centerY + binormalY * currentHeight;
        const vertexZ = centerZ + pathNormalZ * offsetDistance + binormalZ * currentHeight;

        vertices.push(new THREE.Vector3(vertexX, vertexY, vertexZ));
      }
    }
  }

  return vertices;
}

/**
 * Generates trimesh collider data (vertices and indices) for physics
 * Returns the actual mesh data that preserves concave features like inner holes
 */
export function generateExtrudedArcTrimeshData(
  props: ExtrudedArcProps,
): { vertices: number[], indices: number[] } {
  const {
    arcRadius,
    pitch,
    width,
    height,
    angle,
    segments,
    closed,
    crossSectionSegments,
    extrusionSegments,
  } = props;

  // Calculate the number of points along the path
  const pathSegments = Math.max(3, Math.floor(segments));
  const crossSegs = Math.max(1, Math.floor(crossSectionSegments));
  const extrudeSegs = Math.max(1, Math.floor(extrusionSegments));

  // Determine if we should close the path
  const shouldClose = closed || (Math.abs(angle) >= Math.PI * 2 - 0.01);
  const totalPathPoints = shouldClose ? pathSegments : pathSegments + 1;

  // Arrays to hold trimesh data
  const vertices: number[] = [];
  const indices: number[] = [];

  // Generate vertices (reuse the same logic as the main geometry function)
  for (let pathIdx = 0; pathIdx < totalPathPoints; pathIdx++) {
    // Handle wrap-around for closed paths
    const t = shouldClose && pathIdx === pathSegments ? 0 : pathIdx / pathSegments;
    
    // Calculate position along path
    const currentAngle = angle * t;
    const currentPitch = pitch * t;

    // Center position on the path
    const centerX = arcRadius * Math.cos(currentAngle);
    const centerZ = arcRadius * Math.sin(currentAngle);
    const centerY = currentPitch;

    // Calculate tangent vector (direction of the path)
    const tangentX = -Math.sin(currentAngle);
    const tangentZ = Math.cos(currentAngle);
    const tangentY = pitch / angle; // Derivative of pitch with respect to angle

    // Normalize tangent
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);
    const normalizedTangentX = tangentX / tangentLength;
    const normalizedTangentY = tangentY / tangentLength;
    const normalizedTangentZ = tangentZ / tangentLength;

    // Calculate path normal (pointing outward from arc center)
    const pathNormalX = Math.cos(currentAngle);
    const pathNormalZ = Math.sin(currentAngle);
    const pathNormalY = 0;

    // Calculate binormal (cross product of tangent and path normal)
    const binormalX = normalizedTangentY * pathNormalZ - normalizedTangentZ * pathNormalY;
    const binormalY = normalizedTangentZ * pathNormalX - normalizedTangentX * pathNormalZ;
    const binormalZ = normalizedTangentX * pathNormalY - normalizedTangentY * pathNormalX;

    // Generate cross-section vertices (width direction)
    for (let crossIdx = 0; crossIdx <= crossSegs; crossIdx++) {
      const crossT = (crossIdx / crossSegs) - 0.5; // -0.5 to 0.5
      const offsetDistance = width * crossT;

      // Generate extrusion vertices (height direction)
      for (let extrudeIdx = 0; extrudeIdx <= extrudeSegs; extrudeIdx++) {
        const extrudeT = extrudeIdx / extrudeSegs; // 0 to 1
        const currentHeight = height * extrudeT;

        // Calculate final vertex position using proper cross-section coordinates
        const vertexX = centerX + pathNormalX * offsetDistance + binormalX * currentHeight;
        const vertexY = centerY + binormalY * currentHeight;
        const vertexZ = centerZ + pathNormalZ * offsetDistance + binormalZ * currentHeight;

        vertices.push(vertexX, vertexY, vertexZ);
      }
    }
  }

  // Generate faces (reuse the same logic as the main geometry function)
  const verticesPerCrossSection = (crossSegs + 1) * (extrudeSegs + 1);
  const pathCount = shouldClose ? pathSegments : pathSegments;

  for (let pathIdx = 0; pathIdx < pathCount; pathIdx++) {
    const currentBase = pathIdx * verticesPerCrossSection;
    const nextPathIdx = shouldClose && pathIdx === pathSegments - 1 ? 0 : pathIdx + 1;
    const nextBase = nextPathIdx * verticesPerCrossSection;

    for (let crossIdx = 0; crossIdx < crossSegs; crossIdx++) {
      for (let extrudeIdx = 0; extrudeIdx < extrudeSegs; extrudeIdx++) {
        // Calculate vertex indices for current quad
        const bottomLeft = currentBase + crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const bottomRight = currentBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const topLeft = currentBase + crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const topRight = currentBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // Calculate corresponding vertices on next path segment
        const nextBottomLeft = nextBase + crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const nextBottomRight = nextBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const nextTopLeft = nextBase + crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const nextTopRight = nextBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // Main surface quads
        if (extrudeIdx > 0 && extrudeIdx < extrudeSegs && crossIdx > 0 && crossIdx < crossSegs) {
          // Main surface faces (proper winding)
          indices.push(bottomLeft, nextBottomLeft, topLeft);
          indices.push(nextBottomLeft, nextTopLeft, topLeft);
          
          indices.push(bottomRight, topRight, nextBottomRight);
          indices.push(topRight, nextTopRight, nextBottomRight);
        }

        // Bottom face
        if (extrudeIdx === 0) {
          indices.push(bottomLeft, bottomRight, nextBottomLeft);
          indices.push(bottomRight, nextBottomRight, nextBottomLeft);
        }

        // Top face  
        if (extrudeIdx === extrudeSegs - 1) {
          indices.push(topLeft, nextTopLeft, topRight);
          indices.push(nextTopLeft, nextTopRight, topRight);
        }

        // Inner side face
        if (crossIdx === 0) {
          indices.push(bottomLeft, topLeft, nextBottomLeft);
          indices.push(topLeft, nextTopLeft, nextBottomLeft);
        }
        
        // Outer side face
        if (crossIdx === crossSegs - 1) {
          indices.push(bottomRight, nextBottomRight, topRight);
          indices.push(nextBottomRight, nextTopRight, topRight);
        }
      }
    }
  }

  // Create end caps for non-closed paths
  if (!shouldClose) {
    // Start cap
    for (let crossIdx = 0; crossIdx < crossSegs; crossIdx++) {
      for (let extrudeIdx = 0; extrudeIdx < extrudeSegs; extrudeIdx++) {
        const v1 = crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const v2 = (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const v3 = crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const v4 = (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // Start cap faces (facing backward)
        indices.push(v1, v3, v2);
        indices.push(v2, v3, v4);
      }
    }

    // End cap
    const endBase = pathSegments * verticesPerCrossSection;
    for (let crossIdx = 0; crossIdx < crossSegs; crossIdx++) {
      for (let extrudeIdx = 0; extrudeIdx < extrudeSegs; extrudeIdx++) {
        const v1 = endBase + crossIdx * (extrudeSegs + 1) + extrudeIdx;
        const v2 = endBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx;
        const v3 = endBase + crossIdx * (extrudeSegs + 1) + extrudeIdx + 1;
        const v4 = endBase + (crossIdx + 1) * (extrudeSegs + 1) + extrudeIdx + 1;

        // End cap faces (facing forward)
        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }
    }
  }

  return { vertices, indices };
}