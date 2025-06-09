import React, { forwardRef, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import useEditorStore from "@/stores/editor-store";
import { 
  TransformManager, 
  PivotControlsWrapper, 
  PhysicsWrapper, 
  VisualContentRenderer 
} from "./components";
import { 
  createDefaultMeshComponent, 
  separatePhysicsComponents, 
  shouldApplyTransformToGroup
} from "./utils";

/**
 * SceneObject Component - Optimized for performance
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Separated concerns into specialized components
 * - Memoized expensive operations
 * - Reduced re-renders through React.memo
 * - Optimized matrix calculations
 * - Eliminated object creation in render cycles
 * 
 * TRANSFORM ARCHITECTURE:
 * - Non-physics objects: Transform applied to outer group
 * - Physics objects: Transform controlled by RigidBody
 * - Editor interaction: PivotControls update GameObject.transform
 */

interface SceneObjectProps {
  obj: GameObject;
  selectedObjects: string[];
  onSelect: (id: string) => void;
  renderType?: "solid" | "wireframe" | "normals" | "realistic";
}

const SceneObject = forwardRef<THREE.Group, SceneObjectProps>(({ 
  obj, 
  selectedObjects, 
  onSelect, 
  renderType = "solid" 
}, ref) => {
  const { transform, components, children, visible } = obj;
  const groupRef = useRef<THREE.Group>(null);
  const matrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const isManipulatingRef = useRef(false);
  const { editorMode, physicsState } = useEditorStore();

  // Memoize derived values to prevent recalculation
  const isSelected = useMemo(() => selectedObjects.includes(obj.id), [selectedObjects, obj.id]);
  const shouldShowHelpers = useMemo(() => isSelected && physicsState !== 'playing', [isSelected, physicsState]);
  
  // Memoize physics component separation
  const { rigidBodyComp, regularComponents } = useMemo(() => 
    separatePhysicsComponents(components), [components]
  );

  const hasRigidBody = useMemo(() => Boolean(rigidBodyComp), [rigidBodyComp]);
  const isControlledByPivot = useMemo(() => isSelected && editorMode !== "select", [isSelected, editorMode]);
  const isPivotControlsActive = isControlledByPivot;

  // Memoize effective components
  const effectiveComponents = useMemo(() => 
    components.length > 0 ? regularComponents : [createDefaultMeshComponent(isSelected, renderType)],
    [components.length, regularComponents, isSelected, renderType]
  );

  // Memoize transform for physics wrapper
  const transformForPhysics = useMemo(() => transform, [transform]);

  // Optimized matrix change handler
  const handleMatrixChange = useCallback((matrix: THREE.Matrix4) => {
    matrixRef.current.copy(matrix);
  }, []);

  // Optimized click handler
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(obj.id);
  }, [onSelect, obj.id]);

  // Memoize group props
  const shouldApplyTransform = useMemo(() => 
    shouldApplyTransformToGroup(hasRigidBody, isControlledByPivot), 
    [hasRigidBody, isControlledByPivot]
  );

  const groupProps = useMemo(() => {
    const { transform } = obj;
    const { position, rotation, scale } = transform;

    return {
      ref: isSelected ? (ref || groupRef) : groupRef,
      onClick: handleClick,
      ...(shouldApplyTransform && {
        position: [position.x, position.y, position.z] as [number, number, number],
        rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
        scale: [scale.x, scale.y, scale.z] as [number, number, number],
      }),
    };
  }, [obj, isSelected, ref, handleClick, shouldApplyTransform]);

  if (!visible) return null;

  return (
    <>
      <TransformManager
        transform={transform}
        isManipulating={isManipulatingRef.current}
        onMatrixChange={handleMatrixChange}
      />
      <PivotControlsWrapper
        isSelected={isSelected}
        objectId={obj.id}
        matrix={matrixRef.current}
      >
        <group {...groupProps}>
          {isPivotControlsActive ? (
            // When pivot controls are active, treat exactly like non-physics object
            <VisualContentRenderer
              components={effectiveComponents}
              children={children}
              selectedObjects={selectedObjects}
              onSelect={onSelect}
              showHelpers={shouldShowHelpers}
              renderType={renderType}
            />
          ) : (
            // When pivot controls are not active, use normal physics logic
            <PhysicsWrapper
              objectId={obj.id}
              transform={transformForPhysics}
              components={components}
              isPivotControlsActive={isPivotControlsActive}
            >
              <VisualContentRenderer
                components={effectiveComponents}
                children={children}
                selectedObjects={selectedObjects}
                onSelect={onSelect}
                showHelpers={shouldShowHelpers}
                renderType={renderType}
              />
            </PhysicsWrapper>
          )}
        </group>
      </PivotControlsWrapper>
    </>
  );
});

SceneObject.displayName = "SceneObject";

export default React.memo(SceneObject); 