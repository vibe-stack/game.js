# Scene Serializer JSON Structure

This document describes the complete JSON structure used by the Scene Serializer system in the game.js framework. This structure is used for saving and loading scenes, and follows a non-component-based approach.

## Root Scene Structure

```json
{
  "version": "1.0.0",
  "name": "Scene Name",
  "metadata": {
    "created": 1234567890,
    "lastModified": 1234567890,
    "author": "Author Name",
    "description": "Scene description"
  },
  "cameras": [...],
  "lighting": {...},
  "physics": {...},
  "entities": [...],
  "materials": [...],
  "textures": [...]
}
```

## Metadata Structure

```json
{
  "metadata": {
    "created": 1234567890,        // Unix timestamp
    "lastModified": 1234567890,  // Unix timestamp
    "author": "Author Name",      // Optional string
    "description": "Description" // Optional string
  }
}
```

## Camera Structure

```json
{
  "cameras": [
    {
      "id": "main-camera",
      "name": "Main Camera",
      "type": "perspective",        // "perspective" | "orthographic"
      "position": [5, 5, 10],      // [x, y, z]
      "rotation": [0, 0, 0],       // [x, y, z] in radians
      "target": [0, 0, 0],         // Optional [x, y, z] look-at target
      "active": true,              // Boolean - is this the active camera
      "properties": {
        // For perspective cameras:
        "fov": 75,                 // Field of view in degrees
        "aspect": 1.77,            // Aspect ratio
        "near": 0.1,               // Near clipping plane
        "far": 1000,               // Far clipping plane
        "zoom": 1,                 // Zoom level
        
        // For orthographic cameras:
        "left": -10,               // Left clipping plane
        "right": 10,               // Right clipping plane
        "top": 10,                 // Top clipping plane
        "bottom": -10,             // Bottom clipping plane
        "near": 0.1,               // Near clipping plane
        "far": 1000                // Far clipping plane
      },
      "controls": {                // Optional camera controls
        "type": "orbit",           // "orbit" | "fly" | "first-person"
        "enabled": true,
        "properties": {
          "target": [0, 0, 0],     // Control target position
          "enableDamping": true,
          "dampingFactor": 0.05,
          "enableZoom": true,
          "zoomSpeed": 1.0,
          "enableRotate": true,
          "rotateSpeed": 1.0,
          "enablePan": true,
          "panSpeed": 1.0,
          "autoRotate": false,
          "autoRotateSpeed": 2.0,
          "minDistance": 2,
          "maxDistance": 50,
          "minPolarAngle": 0,
          "maxPolarAngle": 3.14159,
          "minAzimuthAngle": -6.28,
          "maxAzimuthAngle": 6.28
        }
      }
    }
  ]
}
```

## Lighting Structure

```json
{
  "lighting": {
    "ambient": {
      "color": 4210752,           // Hexadecimal color (0x404040)
      "intensity": 0.4
    },
    "directional": [
      {
        "id": "sun-light",
        "name": "Sun Light",
        "color": 16777215,        // Hexadecimal color (0xffffff)
        "intensity": 1.0,
        "position": [10, 15, 5],  // [x, y, z]
        "target": [0, 0, 0],      // Optional [x, y, z] target
        "castShadow": true,
        "shadow": {               // Optional shadow settings
          "mapSize": [2048, 2048], // [width, height]
          "camera": {
            "near": 0.1,
            "far": 50,
            "left": -20,
            "right": 20,
            "top": 20,
            "bottom": -20
          }
        }
      }
    ],
    "point": [
      {
        "id": "point-light-1",
        "name": "Point Light Blue",
        "color": 4456447,         // Hexadecimal color (0x4444ff)
        "intensity": 2.0,
        "distance": 10,           // Light falloff distance
        "decay": 2,               // Light decay rate
        "position": [-5, 3, 0],   // [x, y, z]
        "castShadow": false,
        "shadow": {               // Optional shadow settings
          "mapSize": [1024, 1024],
          "camera": {
            "near": 0.1,
            "far": 50
          }
        }
      }
    ],
    "spot": [
      {
        "id": "spot-light-1",
        "name": "Spot Light",
        "color": 16777215,
        "intensity": 1.0,
        "distance": 20,
        "angle": 0.785,           // Cone angle in radians
        "penumbra": 0.1,          // Penumbra percentage
        "decay": 2,
        "position": [0, 10, 0],
        "target": [0, 0, 0],      // Spot light target
        "castShadow": true,
        "shadow": {
          "mapSize": [1024, 1024],
          "camera": {
            "near": 0.1,
            "far": 50,
            "fov": 45
          }
        }
      }
    ]
  }
}
```

## Physics Structure

```json
{
  "physics": {
    "enabled": true,
    "gravity": [0, -9.81, 0],     // [x, y, z] gravity vector
    "debugRender": false,         // Show physics debug visuals
    "solver": {
      "iterations": 10,           // Solver iterations per frame
      "timestep": 0.016666667     // Physics timestep (1/60)
    }
  }
}
```

## Entity Structure

```json
{
  "entities": [
    {
      "id": "unique-entity-id",
      "name": "Entity Name",
      "type": "box",              // Entity type: "sphere", "box", "cylinder", etc.
      "position": [0, 0, 0],      // [x, y, z] world position
      "rotation": [0, 0, 0],      // [x, y, z] rotation in radians
      "scale": [1, 1, 1],         // [x, y, z] scale factors
      "visible": true,            // Visibility flag
      "castShadow": true,         // Cast shadows
      "receiveShadow": true,      // Receive shadows
      "userData": {               // Custom user data
        "purpose": "ground",
        "customProperty": "value"
      },
      "tags": ["ground", "static"], // Array of string tags
      "layer": 0,                 // Render layer
      
      "physics": {                // Optional physics properties
        "enabled": true,
        "type": "static",         // "static" | "dynamic" | "kinematic"
        "mass": 1,                // Mass (for dynamic bodies)
        "restitution": 0.3,       // Bounciness (0-1)
        "friction": 0.8,          // Friction coefficient
        "colliderShape": "box",   // Optional custom collider shape
        "colliderSize": [1, 1, 1] // Optional custom collider size
      },
      
      "geometry": {               // Geometry definition
        "type": "box",            // Geometry type
        "parameters": {           // Type-specific parameters
          "width": 20,
          "height": 0.2,
          "depth": 20
        }
      },
      
      "material": {               // Material definition
        "type": "MeshStandardMaterial",
        "properties": {
          "color": 8947848,       // Hexadecimal color
          "roughness": 0.8,
          "metalness": 0.1,
          "emissive": 0,
          "transparent": false,
          "opacity": 1.0
        }
      },
      
      "children": [               // Optional child entities
        // Nested entity objects with same structure
      ]
    }
  ]
}
```

## Geometry Parameters by Type

### Box Geometry
```json
{
  "type": "box",
  "parameters": {
    "width": 1,
    "height": 1,
    "depth": 1,
    "widthSegments": 1,
    "heightSegments": 1,
    "depthSegments": 1
  }
}
```

### Sphere Geometry
```json
{
  "type": "sphere",
  "parameters": {
    "radius": 0.5,
    "widthSegments": 32,
    "heightSegments": 16,
    "phiStart": 0,
    "phiLength": 6.28318,
    "thetaStart": 0,
    "thetaLength": 3.14159
  }
}
```

### Cylinder Geometry
```json
{
  "type": "cylinder",
  "parameters": {
    "radiusTop": 1,
    "radiusBottom": 1,
    "height": 1,
    "radialSegments": 32,
    "heightSegments": 1,
    "openEnded": false,
    "thetaStart": 0,
    "thetaLength": 6.28318
  }
}
```

### Cone Geometry
```json
{
  "type": "cone",
  "parameters": {
    "radius": 1,
    "height": 1,
    "radialSegments": 32,
    "heightSegments": 1,
    "openEnded": false,
    "thetaStart": 0,
    "thetaLength": 6.28318
  }
}
```

### Torus Geometry
```json
{
  "type": "torus",
  "parameters": {
    "radius": 1,
    "tube": 0.4,
    "radialSegments": 12,
    "tubularSegments": 48,
    "arc": 6.28318
  }
}
```

### Capsule Geometry
```json
{
  "type": "capsule",
  "parameters": {
    "radius": 1,
    "length": 1,
    "capSegments": 4,
    "radialSegments": 8
  }
}
```

### Ring Geometry
```json
{
  "type": "ring",
  "parameters": {
    "innerRadius": 0.5,
    "outerRadius": 1,
    "thetaSegments": 32,
    "phiSegments": 1,
    "thetaStart": 0,
    "thetaLength": 6.28318
  }
}
```

### Plane Geometry
```json
{
  "type": "plane",
  "parameters": {
    "width": 1,
    "height": 1,
    "widthSegments": 1,
    "heightSegments": 1
  }
}
```

## Material Properties by Type

### MeshStandardMaterial
```json
{
  "type": "MeshStandardMaterial",
  "properties": {
    "color": 16777215,          // Hexadecimal color
    "roughness": 0.5,           // 0 = mirror, 1 = rough
    "metalness": 0.0,           // 0 = dielectric, 1 = metal
    "emissive": 0,              // Emissive color
    "emissiveIntensity": 1,     // Emissive intensity
    "transparent": false,       // Enable transparency
    "opacity": 1.0,             // Opacity (0-1)
    "alphaTest": 0,             // Alpha test threshold
    "side": 0,                  // 0=Front, 1=Back, 2=Double
    "wireframe": false,         // Wireframe mode
    "wireframeLinewidth": 1,    // Wireframe line width
    "flatShading": false,       // Flat shading
    "vertexColors": false       // Use vertex colors
  }
}
```

### MeshBasicMaterial
```json
{
  "type": "MeshBasicMaterial",
  "properties": {
    "color": 16777215,
    "transparent": false,
    "opacity": 1.0,
    "wireframe": false,
    "side": 0
  }
}
```

### MeshPhongMaterial
```json
{
  "type": "MeshPhongMaterial",
  "properties": {
    "color": 16777215,
    "emissive": 0,
    "specular": 1118481,        // Specular color
    "shininess": 30,            // Shininess factor
    "transparent": false,
    "opacity": 1.0,
    "wireframe": false,
    "side": 0
  }
}
```

## Materials Array Structure

```json
{
  "materials": [
    {
      "id": "material-1",
      "name": "Ground Material",
      "type": "MeshStandardMaterial",
      "properties": {
        "color": 8947848,
        "roughness": 0.8,
        "metalness": 0.1
      },
      "maps": {                 // Optional texture maps
        "map": "texture-id-1",
        "normalMap": "texture-id-2",
        "roughnessMap": "texture-id-3",
        "metalnessMap": "texture-id-4",
        "emissiveMap": "texture-id-5",
        "bumpMap": "texture-id-6",
        "displacementMap": "texture-id-7",
        "alphaMap": "texture-id-8",
        "envMap": "texture-id-9"
      }
    }
  ]
}
```

## Textures Array Structure

```json
{
  "textures": [
    {
      "id": "texture-1",
      "name": "Ground Texture",
      "url": "path/to/texture.jpg",
      "wrapS": 1000,              // Texture wrapping S (THREE.RepeatWrapping = 1000)
      "wrapT": 1000,              // Texture wrapping T
      "magFilter": 1006,          // Magnification filter (THREE.LinearFilter = 1006)
      "minFilter": 1008,          // Minification filter (THREE.LinearMipmapLinearFilter = 1008)
      "format": 1023,             // Texture format (THREE.RGBAFormat = 1023)
      "type": 1009,               // Texture type (THREE.UnsignedByteType = 1009)
      "anisotropy": 1,            // Anisotropic filtering
      "encoding": 3001,           // Color encoding (THREE.sRGBEncoding = 3001)
      "flipY": true,              // Flip Y coordinate
      "generateMipmaps": true     // Generate mipmaps
    }
  ]
}
```

## Complete Example Scene

```json
{
  "version": "1.0.0",
  "name": "Complete Example Scene",
  "metadata": {
    "created": 1700000000000,
    "lastModified": 1700000000000,
    "author": "Scene Designer",
    "description": "A complete example scene with all features"
  },
  "cameras": [
    {
      "id": "main-camera",
      "name": "Main Camera",
      "type": "perspective",
      "position": [5, 5, 10],
      "rotation": [0, 0, 0],
      "target": [0, 0, 0],
      "active": true,
      "properties": {
        "fov": 75,
        "near": 0.1,
        "far": 1000
      },
      "controls": {
        "type": "orbit",
        "enabled": true,
        "properties": {
          "enableDamping": true,
          "dampingFactor": 0.05,
          "minDistance": 2,
          "maxDistance": 50
        }
      }
    }
  ],
  "lighting": {
    "ambient": {
      "color": 4210752,
      "intensity": 0.4
    },
    "directional": [
      {
        "id": "sun-light",
        "name": "Sun Light",
        "color": 16777215,
        "intensity": 1.0,
        "position": [10, 15, 5],
        "castShadow": true,
        "shadow": {
          "mapSize": [2048, 2048],
          "camera": {
            "near": 0.1,
            "far": 50,
            "left": -20,
            "right": 20,
            "top": 20,
            "bottom": -20
          }
        }
      }
    ],
    "point": [],
    "spot": []
  },
  "physics": {
    "enabled": true,
    "gravity": [0, -9.81, 0],
    "debugRender": false,
    "solver": {
      "iterations": 10,
      "timestep": 0.016666667
    }
  },
  "entities": [
    {
      "id": "ground",
      "name": "Ground",
      "type": "box",
      "position": [0, -1, 0],
      "rotation": [0, 0, 0],
      "scale": [20, 0.2, 20],
      "visible": true,
      "castShadow": false,
      "receiveShadow": true,
      "userData": {
        "purpose": "ground"
      },
      "tags": ["ground", "static"],
      "layer": 0,
      "physics": {
        "enabled": true,
        "type": "static",
        "restitution": 0.3,
        "friction": 0.8
      },
      "geometry": {
        "type": "box",
        "parameters": {
          "width": 20,
          "height": 0.2,
          "depth": 20
        }
      },
      "material": {
        "type": "MeshStandardMaterial",
        "properties": {
          "color": 8947848,
          "roughness": 0.8,
          "metalness": 0.1
        }
      }
    }
  ],
  "materials": [],
  "textures": []
}
```

## Usage Notes

1. **Colors**: All colors are stored as decimal numbers (hexadecimal converted to decimal)
2. **Coordinates**: All 3D coordinates are arrays of [x, y, z] values
3. **Rotations**: All rotations are in radians
4. **Physics Types**: 
   - `"static"` - Immovable objects (walls, floors)
   - `"dynamic"` - Moving objects affected by physics
   - `"kinematic"` - Objects that move but aren't affected by physics
5. **Optional Fields**: Many fields are optional and will use sensible defaults if omitted
6. **Nested Entities**: Entities can have children, creating a hierarchy
7. **Extensibility**: The `userData` field allows custom properties for specific use cases

This structure provides a complete, serializable representation of 3D scenes with physics simulation, lighting, cameras, and materials.