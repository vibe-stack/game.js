import * as THREE from "three/webgpu";
import { Heightfield, HeightfieldConfig } from "./heightfield";

export interface CustomHeightfieldConfig extends HeightfieldConfig {
  // Initial custom height data
  customHeights?: number[][];
  
  // Enable vertex manipulation
  enableVertexManipulation?: boolean;
  
  // Constraints for editing
  minHeight?: number;
  maxHeight?: number;
  
  // Interpolation settings for smooth editing
  smoothRadius?: number; // How many neighboring vertices to affect
  smoothFalloff?: "linear" | "quadratic" | "cubic"; // Falloff curve
}

export interface HeightfieldEdit {
  row: number;
  column: number;
  height: number;
  radius?: number; // Override default smooth radius
  strength?: number; // 0-1, how much to affect the height
}

export interface HeightfieldRegion {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
}

export class CustomHeightfield extends Heightfield {
  public readonly enableVertexManipulation: boolean;
  public readonly heightConstraints: { min: number; max: number };
  public readonly smoothRadius: number;
  public readonly smoothFalloff: string;
  
  private editHistory: HeightfieldEdit[] = [];
  private maxHistorySize = 100;
  private originalHeights: number[][] = [];

  constructor(config: CustomHeightfieldConfig = {}) {
    // If custom heights provided, use them
    if (config.customHeights) {
      const rows = config.customHeights.length;
      const columns = config.customHeights[0]?.length || 1;
      config.rows = config.rows ?? rows;
      config.columns = config.columns ?? columns;
      config.algorithm = "custom";
    }

    super(config);

    this.enableVertexManipulation = config.enableVertexManipulation ?? true;
    this.heightConstraints = {
      min: config.minHeight ?? this.elevationRange.min - 10,
      max: config.maxHeight ?? this.elevationRange.max + 10
    };
    this.smoothRadius = config.smoothRadius ?? 2;
    this.smoothFalloff = config.smoothFalloff ?? "quadratic";

    // Store original heights for reset functionality
    this.originalHeights = this.getHeights();

    // Apply custom heights if provided
    if (config.customHeights) {
      this.setCustomHeights(config.customHeights);
    }
  }

  // Override to handle custom heights
  protected generateHeightfield(): void {
    const customHeights = (this.constructor as any).customHeights;
    if (customHeights) {
      (this as any).heights = customHeights.map((row: number[]) => [...row]);
    } else {
      super.generateHeightfield();
    }
  }

  // Custom height data management
  setCustomHeights(heights: number[][]): this {
    if (heights.length !== this.dimensions.rows || heights[0]?.length !== this.dimensions.columns) {
      throw new Error(`Height data dimensions (${heights.length}x${heights[0]?.length}) don't match heightfield dimensions (${this.dimensions.rows}x${this.dimensions.columns})`);
    }

    (this as any).heights = heights.map(row => [...row]);
    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // Single vertex editing
  setHeightAt(row: number, column: number, height: number, smooth = false): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    if (!this.isValidCoordinate(row, column)) {
      console.warn(`Invalid coordinates: row=${row}, column=${column}`);
      return this;
    }

    const clampedHeight = Math.max(this.heightConstraints.min, Math.min(this.heightConstraints.max, height));
    
    const edit: HeightfieldEdit = {
      row,
      column,
      height: clampedHeight,
      strength: 1.0
    };

    if (smooth) {
      this.applySmoothEdit(edit);
    } else {
      (this as any).heights[row][column] = clampedHeight;
    }

    this.addToHistory(edit);
    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // Batch vertex editing
  setHeightsInRegion(region: HeightfieldRegion, height: number | ((row: number, col: number) => number)): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    const { startRow, endRow, startColumn, endColumn } = region;
    
    for (let row = Math.max(0, startRow); row <= Math.min(this.dimensions.rows - 1, endRow); row++) {
      for (let col = Math.max(0, startColumn); col <= Math.min(this.dimensions.columns - 1, endColumn); col++) {
        const newHeight = typeof height === 'function' ? height(row, col) : height;
        const clampedHeight = Math.max(this.heightConstraints.min, Math.min(this.heightConstraints.max, newHeight));
        (this as any).heights[row][col] = clampedHeight;
      }
    }

    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // Smooth editing with falloff
  applySmoothEdit(edit: HeightfieldEdit): this {
    const radius = edit.radius ?? this.smoothRadius;
    const strength = edit.strength ?? 1.0;
    const targetHeight = edit.height;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const row = edit.row + dr;
        const column = edit.column + dc;

        if (!this.isValidCoordinate(row, column)) continue;

        const distance = Math.sqrt(dr * dr + dc * dc);
        if (distance > radius) continue;

        // Calculate falloff
        const normalizedDistance = distance / radius;
        let falloffStrength: number;

        switch (this.smoothFalloff) {
          case "linear":
            falloffStrength = 1 - normalizedDistance;
            break;
          case "quadratic":
            falloffStrength = 1 - normalizedDistance * normalizedDistance;
            break;
          case "cubic":
            falloffStrength = 1 - normalizedDistance * normalizedDistance * normalizedDistance;
            break;
          default:
            falloffStrength = 1 - normalizedDistance * normalizedDistance;
        }

        const currentHeight = (this as any).heights[row][column];
        const heightDifference = targetHeight - currentHeight;
        const adjustedStrength = falloffStrength * strength;
        const newHeight = currentHeight + heightDifference * adjustedStrength;
        const clampedHeight = Math.max(this.heightConstraints.min, Math.min(this.heightConstraints.max, newHeight));

        (this as any).heights[row][column] = clampedHeight;
      }
    }

    return this;
  }

  // Raise/lower terrain in circular area
  raiseCircularArea(centerRow: number, centerColumn: number, radius: number, amount: number): this {
    return this.modifyCircularArea(centerRow, centerColumn, radius, (currentHeight) => currentHeight + amount);
  }

  lowerCircularArea(centerRow: number, centerColumn: number, radius: number, amount: number): this {
    return this.modifyCircularArea(centerRow, centerColumn, radius, (currentHeight) => currentHeight - amount);
  }

  flattenCircularArea(centerRow: number, centerColumn: number, radius: number, targetHeight?: number): this {
    const height = targetHeight ?? (this as any).heights[centerRow][centerColumn];
    return this.modifyCircularArea(centerRow, centerColumn, radius, () => height);
  }

  private modifyCircularArea(centerRow: number, centerColumn: number, radius: number, heightModifier: (currentHeight: number) => number): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    for (let row = Math.max(0, centerRow - radius); row <= Math.min(this.dimensions.rows - 1, centerRow + radius); row++) {
      for (let col = Math.max(0, centerColumn - radius); col <= Math.min(this.dimensions.columns - 1, centerColumn + radius); col++) {
        const distance = Math.sqrt((row - centerRow) ** 2 + (col - centerColumn) ** 2);
        
        if (distance <= radius) {
          const currentHeight = (this as any).heights[row][col];
          const newHeight = heightModifier(currentHeight);
          const clampedHeight = Math.max(this.heightConstraints.min, Math.min(this.heightConstraints.max, newHeight));
          (this as any).heights[row][col] = clampedHeight;
        }
      }
    }

    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // Noise application to custom areas
  addNoiseToRegion(region: HeightfieldRegion, amplitude: number, frequency: number, seed?: number): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    const actualSeed = seed ?? Math.random() * 1000000;
    const { startRow, endRow, startColumn, endColumn } = region;

    for (let row = Math.max(0, startRow); row <= Math.min(this.dimensions.rows - 1, endRow); row++) {
      for (let col = Math.max(0, startColumn); col <= Math.min(this.dimensions.columns - 1, endColumn); col++) {
        // Simple noise - could be expanded to use the noise generator
        const noise = (Math.sin(row * frequency + actualSeed) + Math.cos(col * frequency + actualSeed)) * amplitude * 0.5;
        const currentHeight = (this as any).heights[row][col];
        const newHeight = currentHeight + noise;
        const clampedHeight = Math.max(this.heightConstraints.min, Math.min(this.heightConstraints.max, newHeight));
        (this as any).heights[row][col] = clampedHeight;
      }
    }

    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // Smoothing operations
  smoothRegion(region: HeightfieldRegion, iterations = 1): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    for (let iter = 0; iter < iterations; iter++) {
      const newHeights = this.getHeights();
      
      for (let row = Math.max(1, region.startRow); row <= Math.min(this.dimensions.rows - 2, region.endRow); row++) {
        for (let col = Math.max(1, region.startColumn); col <= Math.min(this.dimensions.columns - 2, region.endColumn); col++) {
          // Average with neighbors
          const neighbors = [
            (this as any).heights[row - 1][col],
            (this as any).heights[row + 1][col],
            (this as any).heights[row][col - 1],
            (this as any).heights[row][col + 1]
          ];
          
          const average = neighbors.reduce((sum, h) => sum + h, 0) / neighbors.length;
          newHeights[row][col] = average;
        }
      }
      
      (this as any).heights = newHeights;
    }

    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // History management
  private addToHistory(edit: HeightfieldEdit): void {
    this.editHistory.push({ ...edit });
    
    if (this.editHistory.length > this.maxHistorySize) {
      this.editHistory.shift();
    }
  }

  getEditHistory(): HeightfieldEdit[] {
    return this.editHistory.map(edit => ({ ...edit }));
  }

  clearHistory(): this {
    this.editHistory = [];
    return this;
  }

  // Reset functionality
  resetToOriginal(): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    this.setCustomHeights(this.originalHeights);
    this.clearHistory();
    return this;
  }

  resetRegionToOriginal(region: HeightfieldRegion): this {
    if (!this.enableVertexManipulation) {
      console.warn("Vertex manipulation is disabled for this heightfield");
      return this;
    }

    const { startRow, endRow, startColumn, endColumn } = region;
    
    for (let row = Math.max(0, startRow); row <= Math.min(this.dimensions.rows - 1, endRow); row++) {
      for (let col = Math.max(0, startColumn); col <= Math.min(this.dimensions.columns - 1, endColumn); col++) {
        (this as any).heights[row][col] = this.originalHeights[row][col];
      }
    }

    this.applyDisplacement();
    
    if (this.needsPhysicsUpdate) {
      this.updatePhysics();
    }
    
    return this;
  }

  // Utility methods
  private isValidCoordinate(row: number, column: number): boolean {
    return row >= 0 && row < this.dimensions.rows && column >= 0 && column < this.dimensions.columns;
  }

  getHeightAtCoordinate(row: number, column: number): number | null {
    if (!this.isValidCoordinate(row, column)) {
      return null;
    }
    return (this as any).heights[row][column] * this.displacementScale;
  }

  // Serialization support
  serialize(): any {
    return {
      type: "CustomHeightfield",
      dimensions: this.dimensions,
      elevationRange: this.elevationRange,
      heights: this.getHeights(),
      algorithm: this.algorithm,
      seed: this.seed,
      noiseSettings: this.noiseSettings,
      displacementScale: this.displacementScale,
      smoothing: this.smoothing,
      uvScale: this.uvScale,
      enableVertexManipulation: this.enableVertexManipulation,
      heightConstraints: this.heightConstraints,
      smoothRadius: this.smoothRadius,
      smoothFalloff: this.smoothFalloff,
      position: this.position.toArray(),
      rotation: this.rotation.toArray(),
      scale: this.scale.toArray()
    };
  }

  static deserialize(data: any): CustomHeightfield {
    const config: CustomHeightfieldConfig = {
      width: data.dimensions.width,
      depth: data.dimensions.depth,
      rows: data.dimensions.rows,
      columns: data.dimensions.columns,
      minElevation: data.elevationRange.min,
      maxElevation: data.elevationRange.max,
      customHeights: data.heights,
      algorithm: data.algorithm,
      seed: data.seed,
      frequency: data.noiseSettings.frequency,
      amplitude: data.noiseSettings.amplitude,
      octaves: data.noiseSettings.octaves,
      persistence: data.noiseSettings.persistence,
      lacunarity: data.noiseSettings.lacunarity,
      displacementScale: data.displacementScale,
      smoothing: data.smoothing,
      uvScale: data.uvScale,
      enableVertexManipulation: data.enableVertexManipulation,
      minHeight: data.heightConstraints.min,
      maxHeight: data.heightConstraints.max,
      smoothRadius: data.smoothRadius,
      smoothFalloff: data.smoothFalloff,
      position: new THREE.Vector3().fromArray(data.position),
      rotation: new THREE.Euler().fromArray(data.rotation),
      scale: new THREE.Vector3().fromArray(data.scale)
    };

    return new CustomHeightfield(config);
  }

  // Static factory methods for specialized terrain types
  static createVoronoiTerrain(config: Omit<CustomHeightfieldConfig, 'algorithm' | 'voronoiPoints' | 'voronoiRandomness'> = {}): CustomHeightfield {
    return new CustomHeightfield({
      ...config,
      algorithm: "voronoi",
      voronoiPoints: 16,
      voronoiRandomness: 0.8,
      amplitude: 4,
      enableVertexManipulation: true
    });
  }

  static createEditableTerrain(width = 20, depth = 20, resolution = 64): CustomHeightfield {
    return new CustomHeightfield({
      width,
      depth,
      rows: resolution,
      columns: resolution,
      algorithm: "flat",
      enableVertexManipulation: true,
      minHeight: -10,
      maxHeight: 20,
      smoothRadius: 3
    });
  }

  static fromHeightMap(imageData: ImageData, config: Partial<CustomHeightfieldConfig> = {}): CustomHeightfield {
    const { width, height, data } = imageData;
    const heights: number[][] = [];

    // Convert image data to height data
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Convert RGB to grayscale height value (0-1)
        const grayscale = (r + g + b) / (3 * 255);
        row.push(grayscale);
      }
      heights.push(row);
    }

    return new CustomHeightfield({
      ...config,
      customHeights: heights,
      rows: height,
      columns: width,
      enableVertexManipulation: true
    });
  }
}