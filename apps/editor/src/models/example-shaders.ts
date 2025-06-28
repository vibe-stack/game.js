import { TSLShaderConfig } from "./types";

// Example TSL Shaders based on Three.js documentation
export const EXAMPLE_SHADERS: Record<string, TSLShaderConfig> = {
  "detail-map": {
    id: "detail-map",
    name: "Detail Map Shader",
    type: "material",
    graph: {
      nodes: [
        {
          id: "uvInput",
          type: "uv",
          position: { x: -300, y: 0 },
          outputs: [{ id: "uv", name: "UV", type: "vec2" }]
        },
        {
          id: "uvScale",
          type: "multiply",
          position: { x: -100, y: 50 },
          inputs: [
            { id: "a", name: "UV", type: "vec2" },
            { id: "b", name: "Scale", type: "float", defaultValue: 10 }
          ],
          outputs: [{ id: "result", name: "Result", type: "vec2" }]
        },
        {
          id: "baseTexture",
          type: "texture",
          position: { x: 100, y: -100 },
          properties: { texture: null },
          inputs: [{ id: "uv", name: "UV", type: "vec2" }],
          outputs: [{ id: "color", name: "Color", type: "vec4" }]
        },
        {
          id: "detailTexture",
          type: "texture",
          position: { x: 100, y: 100 },
          properties: { texture: null },
          inputs: [{ id: "uv", name: "UV", type: "vec2" }],
          outputs: [{ id: "color", name: "Color", type: "vec4" }]
        },
        {
          id: "multiply",
          type: "multiply",
          position: { x: 300, y: 0 },
          inputs: [
            { id: "a", name: "Base", type: "vec4" },
            { id: "b", name: "Detail", type: "vec4" }
          ],
          outputs: [{ id: "result", name: "Result", type: "vec4" }]
        }
      ],
      connections: [
        {
          from: { nodeId: "uvInput", outputId: "uv" },
          to: { nodeId: "baseTexture", inputId: "uv" }
        },
        {
          from: { nodeId: "uvInput", outputId: "uv" },
          to: { nodeId: "uvScale", inputId: "a" }
        },
        {
          from: { nodeId: "uvScale", outputId: "result" },
          to: { nodeId: "detailTexture", inputId: "uv" }
        },
        {
          from: { nodeId: "baseTexture", outputId: "color" },
          to: { nodeId: "multiply", inputId: "a" }
        },
        {
          from: { nodeId: "detailTexture", outputId: "color" },
          to: { nodeId: "multiply", inputId: "b" }
        }
      ]
    },
    materialConnections: {
      colorNode: "multiply"
    },
    parameters: [
      {
        name: "detailScale",
        type: "float",
        defaultValue: 10,
        min: 0.1,
        max: 50,
        step: 0.1
      }
    ],
    metadata: {
      description: "Adds detail texture to base color map",
      author: "Three.js Examples",
      version: "1.0.0",
      tags: ["detail", "texture", "mapping"]
    }
  },
  
  "animated-noise": {
    id: "animated-noise",
    name: "Animated Noise Shader",
    type: "material",
    graph: {
      nodes: [
        {
          id: "time",
          type: "time",
          position: { x: -300, y: 0 },
          outputs: [{ id: "value", name: "Time", type: "float" }]
        },
        {
          id: "uvInput",
          type: "uv",
          position: { x: -300, y: 100 },
          outputs: [{ id: "uv", name: "UV", type: "vec2" }]
        },
        {
          id: "timeScale",
          type: "multiply",
          position: { x: -100, y: 0 },
          inputs: [
            { id: "a", name: "Time", type: "float" },
            { id: "b", name: "Speed", type: "float", defaultValue: 0.5 }
          ],
          outputs: [{ id: "result", name: "Result", type: "float" }]
        },
        {
          id: "sin",
          type: "sin",
          position: { x: 100, y: 0 },
          inputs: [{ id: "value", name: "Value", type: "float" }],
          outputs: [{ id: "result", name: "Result", type: "float" }]
        },
        {
          id: "uvOffset",
          type: "add",
          position: { x: 100, y: 100 },
          inputs: [
            { id: "a", name: "UV", type: "vec2" },
            { id: "b", name: "Offset", type: "vec2" }
          ],
          outputs: [{ id: "result", name: "Result", type: "vec2" }]
        },
        {
          id: "colorMix",
          type: "mix",
          position: { x: 300, y: 50 },
          inputs: [
            { id: "a", name: "Color1", type: "vec3", defaultValue: [0, 0, 1] },
            { id: "b", name: "Color2", type: "vec3", defaultValue: [1, 0, 0] },
            { id: "factor", name: "Factor", type: "float" }
          ],
          outputs: [{ id: "result", name: "Result", type: "vec3" }]
        }
      ],
      connections: [
        {
          from: { nodeId: "time", outputId: "value" },
          to: { nodeId: "timeScale", inputId: "a" }
        },
        {
          from: { nodeId: "timeScale", outputId: "result" },
          to: { nodeId: "sin", inputId: "value" }
        },
        {
          from: { nodeId: "sin", outputId: "result" },
          to: { nodeId: "colorMix", inputId: "factor" }
        }
      ]
    },
    materialConnections: {
      colorNode: "colorMix"
    },
    parameters: [
      {
        name: "speed",
        type: "float",
        defaultValue: 0.5,
        min: 0,
        max: 5,
        step: 0.1
      }
    ],
    metadata: {
      description: "Animated color gradient using time-based noise",
      author: "Example",
      version: "1.0.0",
      tags: ["animated", "noise", "procedural"]
    }
  },
  
  "fresnel-glow": {
    id: "fresnel-glow",
    name: "Fresnel Glow Effect",
    type: "material",
    graph: {
      nodes: [
        {
          id: "viewDirection",
          type: "cameraViewDirection",
          position: { x: -300, y: 0 },
          outputs: [{ id: "dir", name: "View Dir", type: "vec3" }]
        },
        {
          id: "normal",
          type: "normal",
          position: { x: -300, y: 100 },
          outputs: [{ id: "normal", name: "Normal", type: "vec3" }]
        },
        {
          id: "dot",
          type: "dot",
          position: { x: -100, y: 50 },
          inputs: [
            { id: "a", name: "A", type: "vec3" },
            { id: "b", name: "B", type: "vec3" }
          ],
          outputs: [{ id: "result", name: "Result", type: "float" }]
        },
        {
          id: "oneMinus",
          type: "subtract",
          position: { x: 100, y: 50 },
          inputs: [
            { id: "a", name: "A", type: "float", defaultValue: 1 },
            { id: "b", name: "B", type: "float" }
          ],
          outputs: [{ id: "result", name: "Result", type: "float" }]
        },
        {
          id: "pow",
          type: "pow",
          position: { x: 300, y: 50 },
          inputs: [
            { id: "base", name: "Base", type: "float" },
            { id: "exponent", name: "Exp", type: "float", defaultValue: 3 }
          ],
          outputs: [{ id: "result", name: "Result", type: "float" }]
        },
        {
          id: "fresnelColor",
          type: "multiply",
          position: { x: 500, y: 50 },
          inputs: [
            { id: "a", name: "Fresnel", type: "float" },
            { id: "b", name: "Color", type: "vec3", defaultValue: [0.3, 0.7, 1.0] }
          ],
          outputs: [{ id: "result", name: "Result", type: "vec3" }]
        }
      ],
      connections: [
        {
          from: { nodeId: "viewDirection", outputId: "dir" },
          to: { nodeId: "dot", inputId: "a" }
        },
        {
          from: { nodeId: "normal", outputId: "normal" },
          to: { nodeId: "dot", inputId: "b" }
        },
        {
          from: { nodeId: "dot", outputId: "result" },
          to: { nodeId: "oneMinus", inputId: "b" }
        },
        {
          from: { nodeId: "oneMinus", outputId: "result" },
          to: { nodeId: "pow", inputId: "base" }
        },
        {
          from: { nodeId: "pow", outputId: "result" },
          to: { nodeId: "fresnelColor", inputId: "a" }
        }
      ]
    },
    materialConnections: {
      emissiveNode: "fresnelColor"
    },
    parameters: [
      {
        name: "fresnelPower",
        type: "float",
        defaultValue: 3,
        min: 0.5,
        max: 10,
        step: 0.1
      },
      {
        name: "glowColor",
        type: "vec3",
        defaultValue: [0.3, 0.7, 1.0]
      }
    ],
    metadata: {
      description: "Rim lighting effect using fresnel calculations",
      author: "Example",
      version: "1.0.0",
      tags: ["fresnel", "glow", "rim-light"]
    }
  }
};

export function getExampleShader(id: string): TSLShaderConfig | undefined {
  return EXAMPLE_SHADERS[id];
}

export function getExampleShaderIds(): string[] {
  return Object.keys(EXAMPLE_SHADERS);
}

export function loadExampleShaders(): TSLShaderConfig[] {
  return Object.values(EXAMPLE_SHADERS);
} 