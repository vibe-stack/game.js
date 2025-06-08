// Utility functions for extracting and updating transform values from 4x4 matrices
// Matrix format: [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33]
// Where translation is in positions [12, 13, 14]

export function extractPositionFromMatrix(matrix: number[]): [number, number, number] {
  if (!matrix || matrix.length !== 16) {
    return [0, 0, 0];
  }
  return [matrix[12], matrix[13], matrix[14]];
}

export function extractScaleFromMatrix(matrix: number[]): [number, number, number] {
  if (!matrix || matrix.length !== 16) {
    return [1, 1, 1];
  }
  
  // Extract scale from the first 3 columns
  const sx = Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1] + matrix[2] * matrix[2]);
  const sy = Math.sqrt(matrix[4] * matrix[4] + matrix[5] * matrix[5] + matrix[6] * matrix[6]);
  const sz = Math.sqrt(matrix[8] * matrix[8] + matrix[9] * matrix[9] + matrix[10] * matrix[10]);
  
  return [sx, sy, sz];
}

export function extractRotationFromMatrix(matrix: number[]): [number, number, number] {
  if (!matrix || matrix.length !== 16) {
    return [0, 0, 0];
  }
  
  // Extract scale first to normalize the rotation matrix
  const [sx, sy, sz] = extractScaleFromMatrix(matrix);
  
  // Normalize the rotation matrix
  const m00 = matrix[0] / sx;
  const m01 = matrix[1] / sx;
  const m02 = matrix[2] / sx;
  const m10 = matrix[4] / sy;
  const m11 = matrix[5] / sy;
  const m12 = matrix[6] / sy;
  const m20 = matrix[8] / sz;
  const m21 = matrix[9] / sz;
  const m22 = matrix[10] / sz;
  
  // Extract Euler angles (in radians)
  let x, y, z;
  
  if (Math.abs(m02) < 0.9999999) {
    y = -Math.asin(Math.max(-1, Math.min(1, m02)));
    x = Math.atan2(m12, m22);
    z = Math.atan2(m01, m00);
  } else {
    y = -Math.asin(Math.max(-1, Math.min(1, m02)));
    x = Math.atan2(-m21, m11);
    z = 0;
  }
  
  // Convert to degrees
  return [
    x * (180 / Math.PI),
    y * (180 / Math.PI),
    z * (180 / Math.PI)
  ];
}

export function updateMatrixPosition(matrix: number[], position: [number, number, number]): number[] {
  const newMatrix = [...matrix];
  newMatrix[12] = position[0];
  newMatrix[13] = position[1];
  newMatrix[14] = position[2];
  return newMatrix;
}

export function updateMatrixScale(matrix: number[], scale: [number, number, number]): number[] {
  if (!matrix || matrix.length !== 16) {
    return [scale[0], 0, 0, 0, 0, scale[1], 0, 0, 0, 0, scale[2], 0, 0, 0, 0, 1];
  }
  
  // Extract current scale to normalize first
  const [currentSx, currentSy, currentSz] = extractScaleFromMatrix(matrix);
  
  // Update the scale components
  const newMatrix = [...matrix];
  
  // Update X column
  newMatrix[0] = (newMatrix[0] / currentSx) * scale[0];
  newMatrix[1] = (newMatrix[1] / currentSx) * scale[0];
  newMatrix[2] = (newMatrix[2] / currentSx) * scale[0];
  
  // Update Y column
  newMatrix[4] = (newMatrix[4] / currentSy) * scale[1];
  newMatrix[5] = (newMatrix[5] / currentSy) * scale[1];
  newMatrix[6] = (newMatrix[6] / currentSy) * scale[1];
  
  // Update Z column
  newMatrix[8] = (newMatrix[8] / currentSz) * scale[2];
  newMatrix[9] = (newMatrix[9] / currentSz) * scale[2];
  newMatrix[10] = (newMatrix[10] / currentSz) * scale[2];
  
  return newMatrix;
}

export function updateMatrixRotation(matrix: number[], rotation: [number, number, number]): number[] {
  if (!matrix || matrix.length !== 16) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }
  
  // Convert degrees to radians
  const x = rotation[0] * (Math.PI / 180);
  const y = rotation[1] * (Math.PI / 180);
  const z = rotation[2] * (Math.PI / 180);
  
  // Extract current scale and position
  const [sx, sy, sz] = extractScaleFromMatrix(matrix);
  const [px, py, pz] = extractPositionFromMatrix(matrix);
  
  // Calculate rotation matrix
  const cx = Math.cos(x);
  const sx_sin = Math.sin(x);
  const cy = Math.cos(y);
  const sy_sin = Math.sin(y);
  const cz = Math.cos(z);
  const sz_sin = Math.sin(z);
  
  // Combined rotation matrix (ZYX order)
  const r00 = cy * cz;
  const r01 = -cy * sz_sin;
  const r02 = sy_sin;
  const r10 = sx_sin * sy_sin * cz + cx * sz_sin;
  const r11 = -sx_sin * sy_sin * sz_sin + cx * cz;
  const r12 = -sx_sin * cy;
  const r20 = -cx * sy_sin * cz + sx_sin * sz_sin;
  const r21 = cx * sy_sin * sz_sin + sx_sin * cz;
  const r22 = cx * cy;
  
  // Create new matrix with rotation, scale, and position
  return [
    r00 * sx, r01 * sx, r02 * sx, 0,
    r10 * sy, r11 * sy, r12 * sy, 0,
    r20 * sz, r21 * sz, r22 * sz, 0,
    px, py, pz, 1
  ];
} 