import * as THREE from "three/webgpu";
import { Heightfield, CustomHeightfield } from "./index";

// Example 1: Basic Heightfield with Presets
export function createBasicTerrainExamples() {
  const examples = {
    // Mountain terrain using Fractal Brownian Motion
    mountains: Heightfield.createMountainTerrain({
      width: 50,
      depth: 50,
      rows: 128,
      columns: 128,
      minElevation: 0,
      maxElevation: 20,
      seed: 12345
    }),

    // Rolling hills with Perlin noise
    hills: Heightfield.createHillsTerrain({
      width: 30,
      depth: 30,
      rows: 64,
      columns: 64,
      minElevation: -2,
      maxElevation: 8,
      seed: 67890
    }),

    // Canyon terrain with ridged noise
    canyon: Heightfield.createCanyonTerrain({
      width: 40,
      depth: 40,
      rows: 96,
      columns: 96,
      minElevation: 0,
      maxElevation: 15,
      seed: 54321
    }),

    // Voronoi-based terrain
    voronoi: Heightfield.createVoronoiTerrain({
      width: 25,
      depth: 25,
      rows: 64,
      columns: 64,
      minElevation: 0,
      maxElevation: 12,
      seed: 11111
    }),

    // Flat terrain for building
    flat: Heightfield.createFlatTerrain({
      width: 20,
      depth: 20,
      rows: 32,
      columns: 32,
      minElevation: 0,
      maxElevation: 0
    })
  };

  return examples;
}

// Example 2: Advanced Heightfield Customization
export function createAdvancedTerrainExample() {
  // Create a base terrain
  const terrain = new Heightfield({
    width: 40,
    depth: 40,
    rows: 128,
    columns: 128,
    algorithm: "fbm",
    frequency: 0.05,
    amplitude: 10,
    octaves: 6,
    persistence: 0.6,
    lacunarity: 2.0,
    seed: 42,
    displacementScale: 1.5,
    uvScale: { x: 4, y: 4 }
  });

  // Apply a custom material
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5c3a,
    roughness: 0.9,
    metalness: 0.1
  });
  terrain.setMaterial(terrainMaterial);

  // Enable physics
  terrain.enableStaticPhysics();

  return terrain;
}

// Example 3: Custom Heightfield with Manual Editing
export function createEditableTerrainExample() {
  // Create an editable terrain
  const customTerrain = CustomHeightfield.createEditableTerrain(30, 30, 64);

  // Create some basic landscape features
  const centerRow = Math.floor(customTerrain.dimensions.rows / 2);
  const centerCol = Math.floor(customTerrain.dimensions.columns / 2);

  // Create a mountain in the center
  customTerrain.raiseCircularArea(centerRow, centerCol, 8, 5);

  // Create some hills around it
  customTerrain.raiseCircularArea(centerRow - 15, centerCol - 15, 4, 3);
  customTerrain.raiseCircularArea(centerRow + 12, centerCol - 10, 5, 2.5);
  customTerrain.raiseCircularArea(centerRow - 8, centerCol + 18, 3, 4);

  // Create a valley
  customTerrain.lowerCircularArea(centerRow + 8, centerCol + 8, 6, 2);

  // Flatten an area for building
  customTerrain.flattenCircularArea(centerRow - 20, centerCol, 4, 0);

  // Add some noise to specific regions for texture
  customTerrain.addNoiseToRegion(
    {
      startRow: centerRow - 10,
      endRow: centerRow + 10,
      startColumn: centerCol - 10,
      endColumn: centerCol + 10
    },
    0.5, // amplitude
    0.3, // frequency
    789 // seed
  );

  // Smooth some rough areas
  customTerrain.smoothRegion(
    {
      startRow: centerRow - 5,
      endRow: centerRow + 5,
      startColumn: centerCol - 5,
      endColumn: centerCol + 5
    },
    2 // iterations
  );

  return customTerrain;
}

// Example 4: Voronoi Terrain with Custom Modifications
export function createVoronoiTerrainExample() {
  // Create a voronoi terrain
  const voronoiTerrain = CustomHeightfield.createVoronoiTerrain({
    width: 35,
    depth: 35,
    rows: 96,
    columns: 96,
    seed: 2023
  });

  // Modify specific cells to create interesting features
  const rows = voronoiTerrain.dimensions.rows;
  const cols = voronoiTerrain.dimensions.columns;

  // Create some custom modifications
  for (let i = 0; i < 5; i++) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const height = Math.random() * 8 - 2; // -2 to 6
    
    voronoiTerrain.setHeightAt(row, col, height, true); // smooth = true
  }

  return voronoiTerrain;
}

// Example 5: Height-based Material Variation
export function createMaterialVariationExample() {
  const terrain = Heightfield.createMountainTerrain({
    width: 50,
    depth: 50,
    rows: 128,
    columns: 128,
    seed: 9999
  });

  // Create materials for different elevations
  const materials = {
    water: new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.1, metalness: 0.8 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xf3e37c, roughness: 0.9, metalness: 0.0 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8, metalness: 0.0 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9, metalness: 0.2 }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.0 })
  };

  // Note: In a real implementation, you'd want to use a shader material
  // that blends these materials based on height. For now, we'll use grass.
  terrain.setMaterial(materials.grass);

  return { terrain, materials };
}

// Example 6: Serialization Example
export function createSerializationExample() {
  // Create a custom terrain
  const originalTerrain = CustomHeightfield.createEditableTerrain(20, 20, 32);
  
  // Make some modifications
  originalTerrain.raiseCircularArea(10, 10, 4, 3);
  originalTerrain.lowerCircularArea(15, 5, 2, 1);

  // Serialize the terrain
  const serializedData = originalTerrain.serialize();

  // Deserialize to create a copy
  const recreatedTerrain = CustomHeightfield.deserialize(serializedData);
  
  return { originalTerrain, recreatedTerrain, serializedData };
}

// Example 7: Physics Integration Example
export function createPhysicsIntegrationExample() {
  const terrain = Heightfield.createMountainTerrain({
    width: 30,
    depth: 30,
    rows: 64,
    columns: 64
  });

  // Enable physics
  terrain.enableStaticPhysics(0.6, 0.8); // restitution, friction

  // Position the terrain
  terrain.setPosition(0, 0, 0);

  // Create a ball to roll on the terrain
  const ball = new (class extends THREE.Object3D {
    constructor() {
      super();
      const geometry = new THREE.SphereGeometry(0.5);
      const material = new THREE.MeshStandardMaterial({ color: 0xff4444 });
      const mesh = new THREE.Mesh(geometry, material);
      this.add(mesh);
      
      // Position above the terrain
      this.position.set(0, 10, 0);
    }
  })();

  // In a real implementation, you'd also set up physics for the ball
  // and let it interact with the terrain's physics body

  return { terrain, ball };
}

// Example 8: Multiple Terrain Types Scene
export function createMultiTerrainScene() {
  const scene = new THREE.Scene();

  // Create different terrain types
  const mountainTerrain = Heightfield.createMountainTerrain({
    width: 20,
    depth: 20,
    rows: 64,
    columns: 64
  });
  mountainTerrain.setPosition(-25, 0, 0);

  const hillsTerrain = Heightfield.createHillsTerrain({
    width: 20,
    depth: 20,
    rows: 64,
    columns: 64
  });
  hillsTerrain.setPosition(25, 0, 0);

  const canyonTerrain = Heightfield.createCanyonTerrain({
    width: 20,
    depth: 20,
    rows: 64,
    columns: 64
  });
  canyonTerrain.setPosition(0, 0, 25);

  const editableTerrain = CustomHeightfield.createEditableTerrain(20, 20, 64);
  editableTerrain.setPosition(0, 0, -25);

  // Add all terrains to the scene
  scene.add(mountainTerrain);
  scene.add(hillsTerrain);
  scene.add(canyonTerrain);
  scene.add(editableTerrain);

  return {
    scene,
    terrains: {
      mountains: mountainTerrain,
      hills: hillsTerrain,
      canyon: canyonTerrain,
      editable: editableTerrain
    }
  };
}

// Utility function to create terrain with custom noise settings
export function createCustomNoiseTerrainExample() {
  const terrain = new Heightfield({
    width: 40,
    depth: 40,
    rows: 128,
    columns: 128,
    algorithm: "fbm",
    frequency: 0.03,
    amplitude: 8,
    octaves: 5,
    persistence: 0.4,
    lacunarity: 2.5,
    seed: Date.now(),
    displacementScale: 1.2,
    smoothing: true,
    uvScale: { x: 2, y: 2 }
  });

  // Create a natural-looking material
  const material = new THREE.MeshStandardMaterial({
    color: 0x8fbc8f,
    roughness: 0.8,
    metalness: 0.1
  });
  
  terrain.setMaterial(material);
  
  return terrain;
}

// Example usage and testing
export function runHeightfieldExamples() {
  
  try {
    // Test basic terrain creation
    const basicExamples = createBasicTerrainExamples();
    
    // Test advanced terrain
    const advancedTerrain = createAdvancedTerrainExample();
    
    // Test editable terrain
    const editableTerrain = createEditableTerrainExample();
    
    // Test voronoi terrain
    const voronoiTerrain = createVoronoiTerrainExample();
    
    // Test serialization
    const serializationExample = createSerializationExample();
    
    // Test physics integration
    const physicsExample = createPhysicsIntegrationExample();
    
    // Test multi-terrain scene
    const multiTerrainScene = createMultiTerrainScene();
    
    // Test custom noise terrain
    const customNoiseTerrain = createCustomNoiseTerrainExample();
    
    return {
      basicExamples,
      advancedTerrain,
      editableTerrain,
      voronoiTerrain,
      serializationExample,
      physicsExample,
      multiTerrainScene,
      customNoiseTerrain
    };
    
  } catch (error) {
    console.error("Error running heightfield examples:", error);
    throw error;
  }
}