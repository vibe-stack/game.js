export interface HeightfieldConfig {
  width: number;
  depth: number;
  rows: number;
  columns: number;
  minElevation: number;
  maxElevation: number;
  algorithm: "perlin" | "simplex" | "ridged" | "fbm" | "voronoi" | "diamond-square" | "random" | "flat" | "custom";
  seed: number;
  noise: {
    frequency: number;
    amplitude: number;
    octaves: number;
    persistence: number;
    lacunarity: number;
  };
  customHeights?: number[][];
  uvScale: { x: number; y: number };
  smoothing: boolean;
  wireframe: boolean;
}

export function generateHeightfieldData(config: HeightfieldConfig): {
  heights: number[][];
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
} {
  const { rows, columns, width, depth, minElevation, maxElevation, algorithm } = config;
  
  // Generate height data
  const heights: number[][] = [];
  
  for (let i = 0; i <= rows; i++) {
    heights[i] = [];
    for (let j = 0; j <= columns; j++) {
      let height = 0;
      
      switch (algorithm) {
        case "flat":
          height = minElevation;
          break;
        case "random":
          height = minElevation + Math.random() * (maxElevation - minElevation);
          break;
        case "custom":
          if (config.customHeights && config.customHeights[i] && config.customHeights[i][j] !== undefined) {
            height = config.customHeights[i][j];
          } else {
            height = minElevation;
          }
          break;
        default:
          // For other algorithms, use a simple sine wave as placeholder
          const x = (i / rows) * 2 * Math.PI;
          const z = (j / columns) * 2 * Math.PI;
          height = minElevation + (Math.sin(x) * Math.cos(z) + 1) * 0.5 * (maxElevation - minElevation);
          break;
      }
      
      heights[i][j] = height;
    }
  }
  
  // Generate vertices, indices, normals, and UVs
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  
  // Create vertices and UVs
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= columns; j++) {
      const x = (j / columns) * width - width / 2;
      const z = (i / rows) * depth - depth / 2;
      const y = heights[i][j];
      
      vertices.push(x, y, z);
      uvs.push(j / columns, i / rows);
      
      // Calculate normal (simplified)
      const normal = calculateNormal(heights, i, j, rows, columns);
      normals.push(normal.x, normal.y, normal.z);
    }
  }
  
  // Create indices
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (columns + 1) + j;
      const d = c + 1;
      
      // Two triangles per quad
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  return {
    heights,
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs)
  };
}

function calculateNormal(heights: number[][], row: number, col: number, rows: number, columns: number): { x: number; y: number; z: number } {
  const left = col > 0 ? heights[row][col - 1] : heights[row][col];
  const right = col < columns ? heights[row][col + 1] : heights[row][col];
  const up = row > 0 ? heights[row - 1][col] : heights[row][col];
  const down = row < rows ? heights[row + 1][col] : heights[row][col];
  
  const x = left - right;
  const z = up - down;
  const y = 2.0; // Scale factor
  
  // Normalize
  const length = Math.sqrt(x * x + y * y + z * z);
  return {
    x: x / length,
    y: y / length,
    z: z / length
  };
} 