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
    ridgeOffset?: number;
    voronoiPoints?: number;
    voronoiRandomness?: number;
  };
  customHeights?: number[][];
  uvScale: { x: number; y: number };
  smoothing: boolean;
  wireframe: boolean;
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

// Perlin noise implementation
class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed: number) {
    const rng = new SeededRandom(seed);
    this.permutation = [];
    
    // Create permutation array
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    
    // Shuffle array
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.random() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    
    // Duplicate permutation
    this.p = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.p[i] = this.permutation[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    
    return this.lerp(v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
    );
  }

  fbm(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  ridged(x: number, y: number, octaves: number, persistence: number, lacunarity: number, ridgeOffset: number = 1.0): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let weight = 1;

    for (let i = 0; i < octaves; i++) {
      let signal = Math.abs(this.noise(x * frequency, y * frequency));
      signal = ridgeOffset - signal;
      signal *= signal;
      signal *= weight;

      weight = Math.max(0, Math.min(1, signal * 2));

      value += signal * amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value;
  }
}

// Simplex noise (simplified 2D version)
class SimplexNoise {
  private perm: number[];
  private permMod12: number[];

  constructor(seed: number) {
    const rng = new SeededRandom(seed);
    this.perm = new Array(512);
    this.permMod12 = new Array(512);
    
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  private grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
    
    let n0, n1, n2;
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70.0 * (n0 + n1 + n2);
  }
}

// Voronoi noise
class VoronoiNoise {
  private points: { x: number; y: number }[];

  constructor(seed: number, numPoints: number, randomness: number) {
    const rng = new SeededRandom(seed);
    this.points = [];
    
    for (let i = 0; i < numPoints; i++) {
      this.points.push({
        x: rng.random() * randomness,
        y: rng.random() * randomness
      });
    }
  }

  noise(x: number, y: number): number {
    let minDist = Infinity;
    
    for (const point of this.points) {
      const dx = x - point.x;
      const dy = y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }
    
    return 1.0 - Math.min(1.0, minDist);
  }
}

// Diamond-Square algorithm
class DiamondSquare {
  private size: number;
  private map: number[][];
  private rng: SeededRandom;

  constructor(seed: number, size: number) {
    this.size = size;
    this.rng = new SeededRandom(seed);
    this.map = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Initialize corners
    this.map[0][0] = this.rng.random();
    this.map[0][size - 1] = this.rng.random();
    this.map[size - 1][0] = this.rng.random();
    this.map[size - 1][size - 1] = this.rng.random();
    
    this.generate(size - 1, 1.0);
  }

  private generate(stepSize: number, scale: number): void {
    const halfStep = stepSize / 2;
    
    if (halfStep < 1) return;
    
    // Diamond step
    for (let y = halfStep; y < this.size; y += stepSize) {
      for (let x = halfStep; x < this.size; x += stepSize) {
        const avg = (
          this.map[y - halfStep][x - halfStep] +
          this.map[y - halfStep][x + halfStep] +
          this.map[y + halfStep][x - halfStep] +
          this.map[y + halfStep][x + halfStep]
        ) / 4;
        
        this.map[y][x] = avg + (this.rng.random() - 0.5) * scale;
      }
    }
    
    // Square step
    for (let y = 0; y < this.size; y += halfStep) {
      for (let x = (y + halfStep) % stepSize; x < this.size; x += stepSize) {
        const samples = [];
        
        if (y - halfStep >= 0) samples.push(this.map[y - halfStep][x]);
        if (y + halfStep < this.size) samples.push(this.map[y + halfStep][x]);
        if (x - halfStep >= 0) samples.push(this.map[y][x - halfStep]);
        if (x + halfStep < this.size) samples.push(this.map[y][x + halfStep]);
        
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        this.map[y][x] = avg + (this.rng.random() - 0.5) * scale;
      }
    }
    
    this.generate(halfStep, scale * 0.5);
  }

  getHeight(x: number, y: number): number {
    const clampedX = Math.max(0, Math.min(this.size - 1, Math.floor(x * (this.size - 1))));
    const clampedY = Math.max(0, Math.min(this.size - 1, Math.floor(y * (this.size - 1))));
    return this.map[clampedY][clampedX];
  }
}

export function generateHeightfieldData(config: HeightfieldConfig): {
  heights: number[][];
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
} {
  const { rows, columns, width, depth, minElevation, maxElevation, algorithm, seed, noise } = config;
  
  // Initialize noise generators
  const perlin = new PerlinNoise(seed);
  const simplex = new SimplexNoise(seed);
  const voronoi = new VoronoiNoise(seed, noise.voronoiPoints || 10, noise.voronoiRandomness || 1);
  
  // For diamond-square, use next power of 2 + 1
  const dsSize = Math.pow(2, Math.ceil(Math.log2(Math.max(rows, columns)))) + 1;
  const diamondSquare = new DiamondSquare(seed, dsSize);
  
  // Generate height data
  const heights: number[][] = [];
  
  for (let i = 0; i < rows; i++) {
    heights[i] = [];
    for (let j = 0; j < columns; j++) {
      let height = 0;
      
      // Normalize coordinates to [0, 1] range
      const x = j / (columns - 1);
      const y = i / (rows - 1);
      
      // Scale coordinates by frequency
      const fx = x * noise.frequency * 10;
      const fy = y * noise.frequency * 10;
      
      switch (algorithm) {
        case "flat":
          height = 0;
          break;
          
        case "random":
          const rng = new SeededRandom(seed + i * columns + j);
          height = rng.random() * 2 - 1; // [-1, 1]
          break;
          
        case "custom":
          if (config.customHeights && config.customHeights[i] && config.customHeights[i][j] !== undefined) {
            height = config.customHeights[i][j];
          } else {
            height = 0;
          }
          break;
          
        case "perlin":
          height = perlin.noise(fx, fy) * noise.amplitude;
          break;
          
        case "simplex":
          height = simplex.noise(fx, fy) * noise.amplitude;
          break;
          
        case "fbm":
          height = perlin.fbm(fx, fy, noise.octaves, noise.persistence, noise.lacunarity) * noise.amplitude;
          break;
          
        case "ridged":
          height = perlin.ridged(fx, fy, noise.octaves, noise.persistence, noise.lacunarity, noise.ridgeOffset || 1.0) * noise.amplitude;
          break;
          
        case "voronoi":
          height = voronoi.noise(fx, fy) * noise.amplitude;
          break;
          
        case "diamond-square":
          height = (diamondSquare.getHeight(x, y) * 2 - 1) * noise.amplitude; // Convert to [-1, 1] range
          break;
          
        default:
          height = 0;
          break;
      }
      
      // Normalize height to elevation range
      const normalizedHeight = minElevation + (height * 0.5 + 0.5) * (maxElevation - minElevation);
      heights[i][j] = Math.max(minElevation, Math.min(maxElevation, normalizedHeight));
    }
  }
  
  // Generate vertices, indices, normals, and UVs
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  
  // Create vertices and UVs
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const x = (j / (columns - 1)) * width - width / 2;
      const z = (i / (rows - 1)) * depth - depth / 2;
      const y = heights[i][j];
      
      vertices.push(x, y, z);
      uvs.push(j / (columns - 1), i / (rows - 1));
      
      // Calculate normal
      const normal = calculateNormal(heights, i, j, rows - 1, columns - 1);
      normals.push(normal.x, normal.y, normal.z);
    }
  }
  
  // Create indices
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < columns - 1; j++) {
      const a = i * columns + j;
      const b = a + 1;
      const c = (i + 1) * columns + j;
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

function calculateNormal(heights: number[][], row: number, col: number, maxRow: number, maxCol: number): { x: number; y: number; z: number } {
  const left = col > 0 ? heights[row][col - 1] : heights[row][col];
  const right = col < maxCol ? heights[row][col + 1] : heights[row][col];
  const up = row > 0 ? heights[row - 1][col] : heights[row][col];
  const down = row < maxRow ? heights[row + 1][col] : heights[row][col];
  
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