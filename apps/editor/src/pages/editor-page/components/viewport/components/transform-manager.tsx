import React, { useRef, useMemo } from "react";
import * as THREE from "three";

interface TransformManagerProps {
  transform: Transform;
  isManipulating: boolean;
  onMatrixChange: (matrix: THREE.Matrix4) => void;
}

const TransformManager: React.FC<TransformManagerProps> = ({
  transform,
  isManipulating,
  onMatrixChange,
}) => {
  const matrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const lastTransformRef = useRef<Transform>(transform);

  // Memoize position, rotation, and scale vectors to prevent unnecessary recalculations
  const position = useMemo(() => 
    new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z),
    [transform.position.x, transform.position.y, transform.position.z]
  );

  const rotation = useMemo(() => 
    new THREE.Euler(transform.rotation.x, transform.rotation.y, transform.rotation.z, 'XYZ'),
    [transform.rotation.x, transform.rotation.y, transform.rotation.z]
  );

  const scale = useMemo(() => 
    new THREE.Vector3(transform.scale.x, transform.scale.y, transform.scale.z),
    [transform.scale.x, transform.scale.y, transform.scale.z]
  );

  // Memoize quaternion to prevent recalculation
  const quaternion = useMemo(() => 
    new THREE.Quaternion().setFromEuler(rotation),
    [rotation]
  );

  // Update matrix when transform changes or when not manipulating
  React.useLayoutEffect(() => {
    if (!isManipulating) {
      matrixRef.current.compose(position, quaternion, scale);
      lastTransformRef.current = { ...transform };
      onMatrixChange(matrixRef.current);
    }
  }, [isManipulating, position, quaternion, scale, transform, onMatrixChange]);

  return null; // This is a logic-only component
};

export default React.memo(TransformManager); 