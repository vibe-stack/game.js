// TSL Node Type Definitions
// Based on Three.js TSL documentation

export const TSL_NODE_CATEGORIES = {
  input: {
    name: 'Input',
    nodes: [
      { type: 'uv', label: 'UV', outputs: ['vec2'] },
      { type: 'position', label: 'Position', outputs: ['vec3'] },
      { type: 'normal', label: 'Normal', outputs: ['vec3'] },
      { type: 'tangent', label: 'Tangent', outputs: ['vec3'] },
      { type: 'bitangent', label: 'Bitangent', outputs: ['vec3'] },
      { type: 'time', label: 'Time', outputs: ['float'] },
      { type: 'deltaTime', label: 'Delta Time', outputs: ['float'] },
      { type: 'cameraPosition', label: 'Camera Position', outputs: ['vec3'] },
      { type: 'cameraViewDirection', label: 'View Direction', outputs: ['vec3'] },
      { type: 'screenUV', label: 'Screen UV', outputs: ['vec2'] },
      { type: 'vertexColor', label: 'Vertex Color', outputs: ['vec4'] },
    ]
  },
  math: {
    name: 'Math',
    nodes: [
      { type: 'add', label: 'Add', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'subtract', label: 'Subtract', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'multiply', label: 'Multiply', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'divide', label: 'Divide', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'mod', label: 'Modulo', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'pow', label: 'Power', inputs: ['float', 'float'], outputs: ['float'] },
      { type: 'sqrt', label: 'Square Root', inputs: ['float'], outputs: ['float'] },
      { type: 'abs', label: 'Absolute', inputs: ['any'], outputs: ['any'] },
      { type: 'sign', label: 'Sign', inputs: ['any'], outputs: ['any'] },
      { type: 'floor', label: 'Floor', inputs: ['any'], outputs: ['any'] },
      { type: 'ceil', label: 'Ceil', inputs: ['any'], outputs: ['any'] },
      { type: 'round', label: 'Round', inputs: ['any'], outputs: ['any'] },
      { type: 'fract', label: 'Fract', inputs: ['any'], outputs: ['any'] },
      { type: 'sin', label: 'Sine', inputs: ['float'], outputs: ['float'] },
      { type: 'cos', label: 'Cosine', inputs: ['float'], outputs: ['float'] },
      { type: 'tan', label: 'Tangent', inputs: ['float'], outputs: ['float'] },
      { type: 'asin', label: 'Arc Sine', inputs: ['float'], outputs: ['float'] },
      { type: 'acos', label: 'Arc Cosine', inputs: ['float'], outputs: ['float'] },
      { type: 'atan', label: 'Arc Tangent', inputs: ['float'], outputs: ['float'] },
      { type: 'atan2', label: 'Arc Tangent 2', inputs: ['float', 'float'], outputs: ['float'] },
      { type: 'min', label: 'Minimum', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'max', label: 'Maximum', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'clamp', label: 'Clamp', inputs: ['any', 'any', 'any'], outputs: ['any'] },
      { type: 'mix', label: 'Mix/Lerp', inputs: ['any', 'any', 'float'], outputs: ['any'] },
      { type: 'step', label: 'Step', inputs: ['any', 'any'], outputs: ['any'] },
      { type: 'smoothstep', label: 'Smoothstep', inputs: ['any', 'any', 'any'], outputs: ['any'] },
    ]
  },
  vector: {
    name: 'Vector',
    nodes: [
      { type: 'normalize', label: 'Normalize', inputs: ['vec'], outputs: ['vec'] },
      { type: 'length', label: 'Length', inputs: ['vec'], outputs: ['float'] },
      { type: 'distance', label: 'Distance', inputs: ['vec', 'vec'], outputs: ['float'] },
      { type: 'dot', label: 'Dot Product', inputs: ['vec', 'vec'], outputs: ['float'] },
      { type: 'cross', label: 'Cross Product', inputs: ['vec3', 'vec3'], outputs: ['vec3'] },
      { type: 'reflect', label: 'Reflect', inputs: ['vec', 'vec'], outputs: ['vec'] },
      { type: 'refract', label: 'Refract', inputs: ['vec', 'vec', 'float'], outputs: ['vec'] },
      { type: 'transformDirection', label: 'Transform Direction', inputs: ['vec3', 'mat4'], outputs: ['vec3'] },
    ]
  },
  texture: {
    name: 'Texture',
    nodes: [
      { type: 'texture', label: 'Texture 2D', inputs: ['vec2'], outputs: ['vec4'] },
      { type: 'cubeTexture', label: 'Cube Texture', inputs: ['vec3'], outputs: ['vec4'] },
      { type: 'texture3D', label: 'Texture 3D', inputs: ['vec3'], outputs: ['vec4'] },
      { type: 'triplanarTexture', label: 'Triplanar Texture', inputs: ['vec3', 'vec3'], outputs: ['vec4'] },
    ]
  },
  color: {
    name: 'Color',
    nodes: [
      { type: 'rgb', label: 'RGB Color', outputs: ['vec3'] },
      { type: 'rgba', label: 'RGBA Color', outputs: ['vec4'] },
      { type: 'hsv', label: 'HSV to RGB', inputs: ['vec3'], outputs: ['vec3'] },
      { type: 'hue', label: 'Hue Shift', inputs: ['vec3', 'float'], outputs: ['vec3'] },
      { type: 'saturation', label: 'Saturation', inputs: ['vec3', 'float'], outputs: ['vec3'] },
      { type: 'luminance', label: 'Luminance', inputs: ['vec3'], outputs: ['float'] },
      { type: 'contrast', label: 'Contrast', inputs: ['vec3', 'float'], outputs: ['vec3'] },
      { type: 'brightness', label: 'Brightness', inputs: ['vec3', 'float'], outputs: ['vec3'] },
      { type: 'posterize', label: 'Posterize', inputs: ['vec3', 'float'], outputs: ['vec3'] },
      { type: 'colorSpace', label: 'Color Space', inputs: ['vec3', 'string', 'string'], outputs: ['vec3'] },
    ]
  },
  lighting: {
    name: 'Lighting',
    nodes: [
      { type: 'diffuse', label: 'Diffuse', inputs: ['vec3', 'vec3'], outputs: ['float'] },
      { type: 'specular', label: 'Specular', inputs: ['vec3', 'vec3', 'vec3', 'float'], outputs: ['float'] },
      { type: 'fresnel', label: 'Fresnel', inputs: ['vec3', 'vec3', 'float'], outputs: ['float'] },
      { type: 'phong', label: 'Phong', inputs: ['vec3', 'vec3', 'vec3', 'float'], outputs: ['vec3'] },
      { type: 'blinnPhong', label: 'Blinn-Phong', inputs: ['vec3', 'vec3', 'vec3', 'float'], outputs: ['vec3'] },
      { type: 'lambert', label: 'Lambert', inputs: ['vec3', 'vec3'], outputs: ['vec3'] },
      { type: 'physical', label: 'Physical', inputs: ['vec3', 'vec3', 'float', 'float'], outputs: ['vec3'] },
    ]
  },
  noise: {
    name: 'Noise',
    nodes: [
      { type: 'noise', label: 'Noise', inputs: ['any'], outputs: ['float'] },
      { type: 'simplex', label: 'Simplex Noise', inputs: ['any'], outputs: ['float'] },
      { type: 'perlin', label: 'Perlin Noise', inputs: ['any'], outputs: ['float'] },
      { type: 'worley', label: 'Worley Noise', inputs: ['any'], outputs: ['float'] },
      { type: 'voronoi', label: 'Voronoi', inputs: ['any'], outputs: ['vec4'] },
      { type: 'fbm', label: 'FBM', inputs: ['any', 'float', 'float'], outputs: ['float'] },
      { type: 'turbulence', label: 'Turbulence', inputs: ['any', 'float', 'float'], outputs: ['float'] },
    ]
  },
  utility: {
    name: 'Utility',
    nodes: [
      { type: 'float', label: 'Float', outputs: ['float'] },
      { type: 'int', label: 'Integer', outputs: ['int'] },
      { type: 'bool', label: 'Boolean', outputs: ['bool'] },
      { type: 'vec2', label: 'Vector2', outputs: ['vec2'] },
      { type: 'vec3', label: 'Vector3', outputs: ['vec3'] },
      { type: 'vec4', label: 'Vector4', outputs: ['vec4'] },
      { type: 'mat3', label: 'Matrix3', outputs: ['mat3'] },
      { type: 'mat4', label: 'Matrix4', outputs: ['mat4'] },
      { type: 'uniform', label: 'Uniform', outputs: ['any'] },
      { type: 'attribute', label: 'Attribute', outputs: ['any'] },
      { type: 'varying', label: 'Varying', inputs: ['any'], outputs: ['any'] },
      { type: 'if', label: 'If', inputs: ['bool', 'any', 'any'], outputs: ['any'] },
      { type: 'switch', label: 'Switch', inputs: ['int', 'any[]'], outputs: ['any'] },
      { type: 'loop', label: 'Loop', inputs: ['int', 'int', 'any'], outputs: ['any'] },
      { type: 'break', label: 'Break', inputs: [], outputs: [] },
      { type: 'continue', label: 'Continue', inputs: [], outputs: [] },
      { type: 'discard', label: 'Discard', inputs: [], outputs: [] },
    ]
  },
  packing: {
    name: 'Packing',
    nodes: [
      { type: 'packNormalToRGB', label: 'Pack Normal to RGB', inputs: ['vec3'], outputs: ['vec3'] },
      { type: 'unpackRGBToNormal', label: 'Unpack RGB to Normal', inputs: ['vec3'], outputs: ['vec3'] },
      { type: 'packDepthToRGBA', label: 'Pack Depth to RGBA', inputs: ['float'], outputs: ['vec4'] },
      { type: 'unpackRGBAToDepth', label: 'Unpack RGBA to Depth', inputs: ['vec4'], outputs: ['float'] },
    ]
  },
  output: {
    name: 'Output',
    nodes: [
      { type: 'colorOutput', label: 'Color Output', inputs: ['vec4'] },
      { type: 'normalOutput', label: 'Normal Output', inputs: ['vec3'] },
      { type: 'metalnessOutput', label: 'Metalness Output', inputs: ['float'] },
      { type: 'roughnessOutput', label: 'Roughness Output', inputs: ['float'] },
      { type: 'emissiveOutput', label: 'Emissive Output', inputs: ['vec3'] },
      { type: 'aoOutput', label: 'AO Output', inputs: ['float'] },
      { type: 'displacementOutput', label: 'Displacement Output', inputs: ['float'] },
      { type: 'alphaOutput', label: 'Alpha Output', inputs: ['float'] },
      { type: 'vertexOutput', label: 'Vertex Output', inputs: ['vec3'] },
    ]
  }
};

// Helper to get node definition
export function getTSLNodeDefinition(nodeType: string) {
  for (const category of Object.values(TSL_NODE_CATEGORIES)) {
    const node = category.nodes.find(n => n.type === nodeType);
    if (node) return node;
  }
  return null;
}

// Type helpers
export type TSLDataType = 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'mat3' | 'mat4' | 'any' | 'vec' | 'texture' | 'sampler2D' | 'samplerCube' | 'sampler3D';

export function isCompatibleType(from: TSLDataType, to: TSLDataType): boolean {
  if (from === to || to === 'any' || from === 'any') return true;
  
  // Vec compatibility
  if (to === 'vec' && (from === 'vec2' || from === 'vec3' || from === 'vec4')) return true;
  
  // Numeric compatibility
  if ((to === 'float' || to === 'int') && (from === 'float' || from === 'int')) return true;
  
  return false;
} 