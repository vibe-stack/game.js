import {
  HeightfieldComponent,
  HeightfieldNoiseSettings,
} from "@/types";

// This class contains the procedural noise algorithms for terrain generation.
class NoiseGenerator {
  static perlin(
    x: number,
    y: number,
    frequency: number,
    amplitude: number,
    seed: number = 0,
  ): number {
    const xi = Math.floor(x * frequency);
    const yi = Math.floor(y * frequency);
    const xf = x * frequency - xi;
    const yf = y * frequency - yi;

    const a = this.hash(xi + seed, yi + seed);
    const b = this.hash(xi + 1 + seed, yi + seed);
    const c = this.hash(xi + seed, yi + 1 + seed);
    const d = this.hash(xi + 1 + seed, yi + 1 + seed);

    const i1 = this.lerp(a, b, this.smoothstep(xf));
    const i2 = this.lerp(c, d, this.smoothstep(xf));

    return this.lerp(i1, i2, this.smoothstep(yf)) * amplitude;
  }

  static simplex(
    x: number,
    y: number,
    frequency: number,
    amplitude: number,
    seed: number = 0,
  ): number {
    const nx = x * frequency + seed * 0.01;
    const ny = y * frequency + seed * 0.01;

    const n1 = Math.sin(nx * 2.1) * Math.cos(ny * 1.8);
    const n2 = Math.sin(nx * 0.8) * Math.cos(ny * 2.3);
    const n3 = Math.sin(nx * 3.7) * Math.cos(ny * 0.6);

    return (n1 + n2 * 0.5 + n3 * 0.25) * amplitude;
  }

  static fbm(
    x: number,
    y: number,
    settings: HeightfieldNoiseSettings,
    seed: number = 0,
  ): number {
    let value = 0;
    let amplitude = settings.amplitude;
    let frequency = settings.frequency;
    let maxValue = 0;

    for (let i = 0; i < settings.octaves; i++) {
      value += this.perlin(x, y, frequency, amplitude, seed + i);
      maxValue += amplitude;
      amplitude *= settings.persistence;
      frequency *= settings.lacunarity;
    }

    return (value / maxValue) * settings.amplitude;
  }

  static ridged(
    x: number,
    y: number,
    settings: HeightfieldNoiseSettings,
    seed: number = 0,
  ): number {
    let value = 0;
    let amplitude = settings.amplitude;
    let frequency = settings.frequency;
    const ridgeOffset = settings.ridgeOffset || 1.0;
    let maxValue = 0;

    for (let i = 0; i < settings.octaves; i++) {
      let n = Math.abs(this.perlin(x, y, frequency, 1.0, seed + i));
      n = ridgeOffset - n;
      n = n * n;
      value += n * amplitude;
      maxValue += amplitude;
      amplitude *= settings.persistence;
      frequency *= settings.lacunarity;
    }

    return (value / maxValue) * settings.amplitude;
  }

  static voronoi(
    x: number,
    y: number,
    settings: HeightfieldNoiseSettings,
    seed: number = 0,
  ): number {
    const points = settings.voronoiPoints || 16;
    const randomness = settings.voronoiRandomness || 1.0;
    let minDist = Infinity;

    const gridSize = Math.ceil(Math.sqrt(points));
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const baseX = (i / gridSize) * 2 - 1;
        const baseY = (j / gridSize) * 2 - 1;

        const offsetX =
          (this.seededRandom(seed + i * 100 + j) - 0.5) * randomness * 0.5;
        const offsetY =
          (this.seededRandom(seed + i * 100 + j + 1000) - 0.5) *
          randomness *
          0.5;

        const px = baseX + offsetX;
        const py = baseY + offsetY;

        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        minDist = Math.min(minDist, dist);
      }
    }

    return (1.0 - Math.min(minDist, 1.0)) * settings.amplitude;
  }

  static diamondSquare(
    size: number,
    roughness: number,
    seed: number,
  ): number[][] {
    const actualSize = Math.pow(2, Math.ceil(Math.log2(size - 1))) + 1;
    const heights = Array(actualSize)
      .fill(null)
      .map(() => Array(actualSize).fill(0));

    const cornerScale = roughness * 2;
    heights[0][0] = (this.seededRandom(seed) - 0.5) * cornerScale;
    heights[0][actualSize - 1] = (this.seededRandom(seed + 1) - 0.5) * cornerScale;
    heights[actualSize - 1][0] = (this.seededRandom(seed + 2) - 0.5) * cornerScale;
    heights[actualSize - 1][actualSize - 1] =
      (this.seededRandom(seed + 3) - 0.5) * cornerScale;

    let stepSize = actualSize - 1;
    let scale = roughness;
    let seedOffset = 10;

    while (stepSize > 1) {
      const halfStep = stepSize / 2;

      for (let y = halfStep; y < actualSize; y += stepSize) {
        for (let x = halfStep; x < actualSize; x += stepSize) {
          const avg =
            (heights[y - halfStep][x - halfStep] +
              heights[y - halfStep][x + halfStep] +
              heights[y + halfStep][x - halfStep] +
              heights[y + halfStep][x + halfStep]) /
            4;
          heights[y][x] =
            avg + (this.seededRandom(seed + seedOffset++) - 0.5) * scale;
        }
      }

      for (let y = 0; y < actualSize; y += halfStep) {
        for (
          let x = (y + halfStep) % stepSize;
          x < actualSize;
          x += stepSize
        ) {
          const avg = this.getNeighborAverage(
            heights,
            x,
            y,
            halfStep,
            actualSize,
          );
          heights[y][x] =
            avg + (this.seededRandom(seed + seedOffset++) - 0.5) * scale;
        }
      }

      stepSize /= 2;
      scale *= 0.6;
    }

    if (actualSize !== size) {
      const resized = Array(size)
        .fill(null)
        .map(() => Array(size).fill(0));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const srcX = Math.floor((x * (actualSize - 1)) / (size - 1));
          const srcY = Math.floor((y * (actualSize - 1)) / (size - 1));
          resized[y][x] = heights[srcY][srcX];
        }
      }
      return resized;
    }

    return heights;
  }

  private static hash(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263) % 2147483647;
    h = (h * h) % 2147483647;
    return (h % 2000) / 1000 - 1;
  }

  private static lerp(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
  }

  private static smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  static seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private static getNeighborAverage(
    heights: number[][],
    x: number,
    y: number,
    halfStep: number,
    size: number,
  ): number {
    let count = 0;
    let sum = 0;

    if (x - halfStep >= 0) {
      sum += heights[y][x - halfStep];
      count++;
    }
    if (x + halfStep < size) {
      sum += heights[y][x + halfStep];
      count++;
    }
    if (y - halfStep >= 0) {
      sum += heights[y - halfStep][x];
      count++;
    }
    if (y + halfStep < size) {
      sum += heights[y + halfStep][x];
      count++;
    }

    return count > 0 ? sum / count : 0;
  }
}

export function generateHeightfieldData(
  props: HeightfieldComponent["properties"],
): number[][] {
  const {
    rows,
    columns,
    algorithm,
    seed,
    noise,
    minElevation,
    maxElevation,
  } = props;
  let heights: number[][];

  switch (algorithm) {
    case "perlin":
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const nx = (x / (columns - 1)) * 8 - 4;
              const ny = (y / (rows - 1)) * 8 - 4;
              const noiseValue = NoiseGenerator.perlin(
                nx,
                ny,
                noise.frequency,
                1.0,
                seed,
              );
              return minElevation +
                (noiseValue + 1) * 0.5 * (maxElevation - minElevation);
            }),
        );
      break;
    case "simplex":
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const nx = (x / (columns - 1)) * 8 - 4;
              const ny = (y / (rows - 1)) * 8 - 4;
              const noiseValue = NoiseGenerator.simplex(
                nx,
                ny,
                noise.frequency,
                1.0,
                seed,
              );
              return minElevation +
                (noiseValue + 1) * 0.5 * (maxElevation - minElevation);
            }),
        );
      break;
    case "fbm":
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const nx = (x / (columns - 1)) * 6 - 3;
              const ny = (y / (rows - 1)) * 6 - 3;
              const noiseValue = NoiseGenerator.fbm(nx, ny, noise, seed);
              return minElevation +
                (noiseValue + 1) * 0.5 * (maxElevation - minElevation);
            }),
        );
      break;
    case "ridged":
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const nx = (x / (columns - 1)) * 6 - 3;
              const ny = (y / (rows - 1)) * 6 - 3;
              const noiseValue = NoiseGenerator.ridged(nx, ny, noise, seed);
              return minElevation +
                (noiseValue + 1) * 0.5 * (maxElevation - minElevation);
            }),
        );
      break;
    case "voronoi":
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const nx = (x / (columns - 1)) * 2 - 1;
              const ny = (y / (rows - 1)) * 2 - 1;
              const noiseValue = NoiseGenerator.voronoi(nx, ny, noise, seed);
              return minElevation + noiseValue * (maxElevation - minElevation);
            }),
        );
      break;
    case "diamond-square": {
      const dsSize = Math.max(rows, columns);
      const dsHeights = NoiseGenerator.diamondSquare(dsSize, 1.0, seed);
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const dsX = Math.floor((x * (dsSize - 1)) / (columns - 1));
              const dsY = Math.floor((y * (dsSize - 1)) / (rows - 1));
              const rawHeight = dsHeights[dsY][dsX];
              return minElevation +
                (rawHeight + 1) * 0.5 * (maxElevation - minElevation);
            }),
        );
      break;
    }
    case "random":
      heights = Array(rows)
        .fill(null)
        .map((_, y) =>
          Array(columns)
            .fill(null)
            .map((_, x) => {
              const randomValue = NoiseGenerator.seededRandom(
                seed + y * columns + x,
              );
              return minElevation + randomValue * (maxElevation - minElevation);
            }),
        );
      break;
    case "flat":
      heights = Array(rows)
        .fill(null)
        .map(() => Array(columns).fill(0));
      break;
    case "custom":
      heights =
        props.customHeights && props.customHeights.length > 0
          ? props.customHeights
          : Array(rows)
              .fill(null)
              .map(() => Array(columns).fill(0));
      break;
    default:
      heights = Array(rows)
        .fill(null)
        .map(() => Array(columns).fill(0));
  }

  const flatHeights = heights.flat();
  const minHeight = Math.min(...flatHeights);
  const maxHeight = Math.max(...flatHeights);
  const range = maxHeight - minHeight;

  if (range > 0) {
    heights = heights.map((row) =>
      row.map(
        (h) =>
          minElevation +
          ((h - minHeight) / range) * (maxElevation - minElevation),
      ),
    );
  }

  return heights;
} 