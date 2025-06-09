import React, { useRef, useCallback, useMemo } from "react";
import { PivotControls } from "@react-three/drei";
import * as THREE from "three";
import useEditorStore from "@/stores/editor-store";

interface PivotControlsWrapperProps {
  isSelected: boolean;
  objectId: string;
  matrix: THREE.Matrix4;
  children: React.ReactNode;
}

const PivotControlsWrapper: React.FC<PivotControlsWrapperProps> = ({
  isSelected,
  objectId,
  matrix,
  children,
}) => {
  const { editorMode, updateObjectTransform } = useEditorStore();
  const isManipulatingRef = useRef(false);

  // Memoize control settings to prevent recalculation
  const controlSettings = useMemo(() => {
    switch (editorMode) {
      case "move":
        return {
          disableAxes: false,
          disableSliders: false,
          disableRotations: true,
          disableScaling: true,
        };
      case "rotate":
        return {
          disableAxes: true,
          disableSliders: true,
          disableRotations: false,
          disableScaling: true,
        };
      case "scale":
        return {
          disableAxes: false,
          disableSliders: false,
          disableRotations: true,
          disableScaling: false,
        };
      default:
        return {
          disableAxes: true,
          disableSliders: true,
          disableRotations: true,
          disableScaling: true,
        };
    }
  }, [editorMode]);

  // Memoized and optimized drag handlers
  const handleDragStart = useCallback(() => {
    isManipulatingRef.current = true;
  }, []);

  const handleDrag = useCallback((local: THREE.Matrix4) => {
    // Reuse objects to avoid garbage collection pressure
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    local.decompose(position, quaternion, scale);
    
    // Convert quaternion to euler rotation with consistent rotation order
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
    
    // Update the object's transform
    updateObjectTransform(objectId, {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      scale: { x: scale.x, y: scale.y, z: scale.z }
    });
  }, [objectId, updateObjectTransform]);

  const handleDragEnd = useCallback(() => {
    isManipulatingRef.current = false;
  }, []);

  // Show pivot controls only when selected and not in select mode
  const shouldShowPivotControls = isSelected && editorMode !== "select";

  if (!shouldShowPivotControls) {
    return <>{children}</>;
  }

  return (
    <PivotControls
      matrix={matrix}
      autoTransform={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      {...controlSettings}
      scale={70}
      lineWidth={2}
      fixed={true}
      annotations
      depthTest={false}
    >
      {children}
    </PivotControls>
  );
};

export default React.memo(PivotControlsWrapper); 