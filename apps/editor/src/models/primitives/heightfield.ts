import * as THREE from "three/webgpu";
import { Entity } from "../entity";
import { EntityConfig } from "../types";
import { generateHeightfieldData } from "../../utils/heightfield-generator";
import { EntityData } from "../scene-loader";

export interface HeightfieldConfig extends EntityConfig {
  // Dimensions
  width?: number; // world units (X axis)
  depth?: number; // world units (Z axis)
  rows?: number; // number of height samples along depth (Z)
  columns?: number; // number of height samples along width (X)

  // Elevation
  minElevation?: number;
  maxElevation?: number;

  // Generation algorithm
  algorithm?:
    | "perlin"
    | "simplex"
    | "ridged"
    | "fbm"
    | "voronoi"
    | "diamond-square"
    | "random"
    | "flat";
  seed?: number;

  // Noise settings
  frequency?: number;
  amplitude?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  ridgeOffset?: number; // For ridged noise
  voronoiPoints?: number; // For voronoi
  voronoiRandomness?: number; // For voronoi

  // Visual properties
  displacementScale?: number;
  smoothing?: boolean;
  wireframe?: boolean;

  // UV scaling
  uvScale?: { x: number; y: number };

  // Material
  material?: THREE.Material;

  // Shadow settings
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class Heightfield extends Entity {
  public readonly dimensions: {
    width: number;
    depth: number;
    rows: number;
    columns: number;
  };
  public readonly elevationRange: { min: number; max: number };
  public readonly algorithm: string;
  public readonly noiseSettings: {
    frequency: number;
    amplitude: number;
    octaves: number;
    persistence: number;
    lacunarity: number;
    ridgeOffset?: number;
    voronoiPoints?: number;
    voronoiRandomness?: number;
  };
  public readonly seed: number;
  public readonly displacementScale: number;
  public readonly smoothing: boolean;
  public readonly uvScale: { x: number; y: number };

  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private heights: number[][] = [];
  protected _needsPhysicsUpdate = false;

  get needsPhysicsUpdate(): boolean {
    return this._needsPhysicsUpdate;
  }

  constructor(config: HeightfieldConfig = {}) {
    super(config);

    // Set dimensions
    this.dimensions = {
      width: config.width ?? 10,
      depth: config.depth ?? 10,
      rows: config.rows ?? 32,
      columns: config.columns ?? 32,
    };

    // Set elevation range
    this.elevationRange = {
      min: config.minElevation ?? 0,
      max: config.maxElevation ?? 5,
    };

    // Set generation algorithm
    this.algorithm = config.algorithm ?? "perlin";
    this.seed = config.seed ?? Math.floor(Math.random() * 1000000);

    // Set noise settings
    this.noiseSettings = {
      frequency: config.frequency ?? 0.1,
      amplitude: config.amplitude ?? 1.0,
      octaves: config.octaves ?? 4,
      persistence: config.persistence ?? 0.5,
      lacunarity: config.lacunarity ?? 2.0,
      ridgeOffset: config.ridgeOffset,
      voronoiPoints: config.voronoiPoints,
      voronoiRandomness: config.voronoiRandomness,
    };

    // Visual properties
    this.displacementScale = config.displacementScale ?? 1.0;
    this.smoothing = config.smoothing ?? false;
    this.uvScale = config.uvScale ?? { x: 1, y: 1 };

    const material =
      config.material ??
      new THREE.MeshStandardMaterial({
        color: 0x6b7c54,
        wireframe: config.wireframe ?? false,
      });

    // Generate initial heightfield data
    this.generateHeightfield();

    // Create geometry
    this.geometry = new THREE.PlaneGeometry(
      this.dimensions.width,
      this.dimensions.depth,
      this.dimensions.columns - 1,
      this.dimensions.rows - 1,
    );

    this.geometry.rotateX(-Math.PI / 2); // Rotate to lie flat

    // Apply displacement
    this.applyDisplacement();

    // Set UV scaling
    this.geometry.attributes.uv.array.forEach((_, i) => {
      if (i % 2 === 0) {
        this.geometry.attributes.uv.array[i] *= this.uvScale.x;
      } else {
        this.geometry.attributes.uv.array[i] *= this.uvScale.y;
      }
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = config.castShadow ?? true;
    this.mesh.receiveShadow = config.receiveShadow ?? true;
    this.add(this.mesh);

    this.metadata.type = "primitive";
    this.addTag("heightfield");
    this.addTag("terrain");
  }

  protected generateHeightfield(): void {
    const heightfieldProperties = {
      width: this.dimensions.width,
      depth: this.dimensions.depth,
      rows: this.dimensions.rows,
      columns: this.dimensions.columns,
      minElevation: this.elevationRange.min,
      maxElevation: this.elevationRange.max,
      algorithm: this.algorithm as any,
      seed: this.seed,
      noise: this.noiseSettings,
      customHeights: undefined,
      uvScale: this.uvScale,
      smoothing: this.smoothing,
      wireframe: false,
    };

    const result = generateHeightfieldData(heightfieldProperties);
    this.heights = result.heights;
  }

  protected applyDisplacement(): void {
    const positions = this.geometry.attributes.position;
    const vertices = positions.array;

    for (let i = 0; i < this.dimensions.rows; i++) {
      for (let j = 0; j < this.dimensions.columns; j++) {
        const vertexIndex = i * this.dimensions.columns + j;
        const height = this.heights[i][j] * this.displacementScale;
        vertices[vertexIndex * 3 + 1] = height; // Y component
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this._needsPhysicsUpdate = true;
  }

  // Public method to manually update displacement (for external height modifications)
  public updateDisplacement(): void {
    this.applyDisplacement();
    if (this._needsPhysicsUpdate && this.physicsManager && this.colliderId) {
      this.updatePhysics();
    }
  }

  protected createCollider(): void {
    if (!this.physicsManager || !this.rigidBodyId) return;

    // The physics collider needs to account for the geometry being rotated -90° around X
    // When we rotate the geometry by -90° around X:
    // - The geometry's width (originally X) becomes the physics Z dimension
    // - The geometry's depth (originally Z) becomes the physics X dimension
    // - We need to transpose the height data to match this coordinate system

    // Transpose the height data to match the rotated coordinate system
    const transposedHeights: number[][] = [];
    for (let j = 0; j < this.dimensions.columns; j++) {
      transposedHeights[j] = [];
      for (let i = 0; i < this.dimensions.rows; i++) {
        transposedHeights[j][i] = this.heights[i][j];
      }
    }

    // Scale represents the total dimensions of the heightfield in world units
    // After rotation: geometry width -> physics Z, geometry depth -> physics X
    const scale = new THREE.Vector3(
      this.dimensions.depth, // X scale: depth becomes X after rotation
      this.displacementScale, // Y scale: height multiplier
      this.dimensions.width, // Z scale: width becomes Z after rotation
    );

    this.physicsManager.createCollider(
      this.colliderId!,
      this.rigidBodyId,
      "heightfield",
      { heights: transposedHeights, scale },
    );
  }

  // Configuration methods
  setDimensions(
    width: number,
    depth: number,
    rows?: number,
    columns?: number,
  ): this {
    (this.dimensions as any).width = width;
    (this.dimensions as any).depth = depth;
    if (rows !== undefined) (this.dimensions as any).rows = rows;
    if (columns !== undefined) (this.dimensions as any).columns = columns;

    this.regenerateGeometry();
    return this;
  }

  setElevationRange(min: number, max: number): this {
    (this.elevationRange as any).min = min;
    (this.elevationRange as any).max = max;

    this.regenerateHeightfield();
    return this;
  }

  setAlgorithm(algorithm: HeightfieldConfig["algorithm"]): this {
    (this as any).algorithm = algorithm ?? "perlin";
    this.regenerateHeightfield();
    return this;
  }

  setSeed(seed: number): this {
    (this as any).seed = seed;
    this.regenerateHeightfield();
    return this;
  }

  setNoiseSettings(settings: Partial<typeof this.noiseSettings>): this {
    Object.assign(this.noiseSettings as any, settings);
    this.regenerateHeightfield();
    return this;
  }

  setDisplacementScale(scale: number): this {
    (this as any).displacementScale = scale;
    this.applyDisplacement();
    if (this._needsPhysicsUpdate) {
      this.updatePhysics();
    }
    return this;
  }

  setUVScale(x: number, y: number): this {
    (this.uvScale as any).x = x;
    (this.uvScale as any).y = y;

    this.geometry.attributes.uv.array.forEach((_, i) => {
      if (i % 2 === 0) {
        this.geometry.attributes.uv.array[i] =
          (this.geometry.attributes.uv.array[i] / this.uvScale.x) * x;
      } else {
        this.geometry.attributes.uv.array[i] =
          (this.geometry.attributes.uv.array[i] / this.uvScale.y) * y;
      }
    });

    this.geometry.attributes.uv.needsUpdate = true;
    this.emitChange();
    return this;
  }

  setMaterial(material: THREE.Material): this {
    this.mesh.material = material;
    this.emitChange();
    return this;
  }

  setShadowSettings(castShadow: boolean, receiveShadow: boolean): this {
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.emitChange();
    return this;
  }

  // Regeneration methods
  regenerateHeightfield(): this {
    this.generateHeightfield();
    this.applyDisplacement();
    if (this._needsPhysicsUpdate) {
      this.updatePhysics();
    }
    this.emitChange();
    return this;
  }

  private regenerateGeometry(): void {
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(
      this.dimensions.width,
      this.dimensions.depth,
      this.dimensions.columns - 1,
      this.dimensions.rows - 1,
    );

    this.geometry.rotateX(-Math.PI / 2);
    this.generateHeightfield();
    this.applyDisplacement();
    this.mesh.geometry = this.geometry;

    if (this._needsPhysicsUpdate) {
      this.updatePhysics();
    }
  }

  protected updatePhysics(): void {
    if (!this.physicsManager || !this.colliderId) return;

    // Remove old collider and create new one
    // this.physicsManager.removeCollider(this.colliderId);
    // this.createCollider();
    // this._needsPhysicsUpdate = false;
  }

  // Getters
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getGeometry(): THREE.PlaneGeometry {
    return this.geometry;
  }

  getHeights(): number[][] {
    return this.heights.map((row) => [...row]); // Return copy
  }

  getHeightAt(x: number, z: number): number {
    // Convert world coordinates to heightfield coordinates
    // Account for the -90° rotation around X axis
    const col = Math.floor(
      ((x + this.dimensions.width / 2) / this.dimensions.width) *
        (this.dimensions.columns - 1),
    );
    const row = Math.floor(
      ((z + this.dimensions.depth / 2) / this.dimensions.depth) *
        (this.dimensions.rows - 1),
    );

    const clampedCol = Math.max(0, Math.min(this.dimensions.columns - 1, col));
    const clampedRow = Math.max(0, Math.min(this.dimensions.rows - 1, row));

    return this.heights[clampedRow][clampedCol] * this.displacementScale;
  }

  // Static factory methods for common presets
  static createMountainTerrain(
    config: Omit<
      HeightfieldConfig,
      "algorithm" | "frequency" | "amplitude" | "octaves"
    > = {},
  ): Heightfield {
    return new Heightfield({
      ...config,
      algorithm: "fbm",
      frequency: 0.05,
      amplitude: 8,
      octaves: 6,
      persistence: 0.6,
      lacunarity: 2.0,
    });
  }

  static createHillsTerrain(
    config: Omit<
      HeightfieldConfig,
      "algorithm" | "frequency" | "amplitude" | "octaves"
    > = {},
  ): Heightfield {
    return new Heightfield({
      ...config,
      algorithm: "perlin",
      frequency: 0.1,
      amplitude: 3,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2.0,
    });
  }

  static createCanyonTerrain(
    config: Omit<
      HeightfieldConfig,
      "algorithm" | "frequency" | "amplitude" | "ridgeOffset"
    > = {},
  ): Heightfield {
    return new Heightfield({
      ...config,
      algorithm: "ridged",
      frequency: 0.08,
      amplitude: 6,
      octaves: 5,
      ridgeOffset: 1.0,
    });
  }

  static createVoronoiTerrain(
    config: Omit<
      HeightfieldConfig,
      "algorithm" | "voronoiPoints" | "voronoiRandomness"
    > = {},
  ): Heightfield {
    return new Heightfield({
      ...config,
      algorithm: "voronoi",
      voronoiPoints: 16,
      voronoiRandomness: 0.8,
      amplitude: 4,
    });
  }

  static createFlatTerrain(
    config: Omit<HeightfieldConfig, "algorithm"> = {},
  ): Heightfield {
    return new Heightfield({
      ...config,
      algorithm: "flat",
    });
  }

  // Debug method for testing physics
  static createDebugTerrain(
    config: Partial<HeightfieldConfig> = {},
  ): Heightfield {
    console.log("Creating debug heightfield terrain for physics testing...");

    const terrain = new Heightfield({
      width: 20,
      depth: 20,
      rows: 10, // Lower resolution for easier debugging
      columns: 10,
      minElevation: 0,
      maxElevation: 5,
      algorithm: "flat", // Start with flat terrain
      displacementScale: 1.0,
      material: new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Bright green for visibility
        wireframe: false,
      }),
      name: "Debug Heightfield",
      ...config,
    });

    // Add some manual height variations for testing
    const heights = terrain.getHeights();
    for (let i = 0; i < heights.length; i++) {
      for (let j = 0; j < heights[i].length; j++) {
        // Create a simple pyramid in the center
        const centerI = Math.floor(heights.length / 2);
        const centerJ = Math.floor(heights[i].length / 2);
        const distFromCenter = Math.max(
          Math.abs(i - centerI),
          Math.abs(j - centerJ),
        );
        const maxDist = Math.max(centerI, centerJ);
        heights[i][j] = Math.max(0, ((maxDist - distFromCenter) / maxDist) * 3);
      }
    }

    // Update the terrain with new heights
    (terrain as any).heights = heights;
    terrain.updateDisplacement();

    console.log("Debug terrain created with manual height data");
    return terrain;
  }

  serialize(): EntityData {
    return {
      id: this.entityId,
      name: this.entityName,
      type: "heightfield",
      transform: {
        position: {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z,
        },
        rotation: {
          x: this.rotation.x,
          y: this.rotation.y,
          z: this.rotation.z,
        },
        scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
      },
      physics: this.serializePhysics(),
      visible: this.visible,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      userData: { ...this.userData },
      tags: [...this.metadata.tags],
      layer: this.metadata.layer,
      geometry: {
        type: "HeightfieldGeometry",
        parameters: {
          width: this.dimensions.width,
          depth: this.dimensions.depth,
          rows: this.dimensions.rows,
          columns: this.dimensions.columns,
          minElevation: this.elevationRange.min,
          maxElevation: this.elevationRange.max,
          customHeights: this.getHeights(),
          algorithm: this.algorithm,
          seed: this.seed,
          frequency: this.noiseSettings.frequency,
          amplitude: this.noiseSettings.amplitude,
          octaves: this.noiseSettings.octaves,
          persistence: this.noiseSettings.persistence,
          lacunarity: this.noiseSettings.lacunarity,
          displacementScale: this.displacementScale,
          smoothing: this.smoothing,
          uvScale: this.uvScale,
        },
      },
    };
  }
}
