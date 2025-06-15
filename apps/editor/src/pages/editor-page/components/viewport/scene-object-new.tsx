import React, { forwardRef, useRef, useCallback, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameWorld } from "@/services/game-world-context";
import useEditorStore from "@/stores/editor-store";
import {
  TransformManager,
  PivotControlsWrapper,
  PhysicsWrapper,
  VisualContentRenderer,
} from "./components";
import { ScriptExecutor } from "./components/script-executor";
import {
  createDefaultMeshComponent,
  separatePhysicsComponents,
  shouldApplyTransformToGroup,
} from "./utils";

/**
 * New SceneObject Component - GameWorld Integration
 * 
 * This component now reads from the GameWorld service imperatively
 * for high-frequency updates, avoiding React's reconciliation overhead.
 * 
 * DATA FLOW:
 * - Initial render: Uses GameObject data from props for setup
 * - High-frequency updates: Reads transforms directly from GameWorld
 * - UI updates: Uses selectedObjectData snapshot from Zustand
 */

interface SceneObjectProps {
  objectId: string;
  selectedObjects: string[];
  onSelect: (id: string, event?: React.MouseEvent) => void;
  renderType?: "solid" | "wireframe" | "normals" | "realistic";
}

const SceneObject = forwardRef<THREE.Group, SceneObjectProps>(
  ({ objectId, selectedObjects, onSelect, renderType = "solid" }, ref) => {
    const gameWorld = useGameWorld();
    const groupRef = useRef<THREE.Group>(null);
    const matrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
    const isManipulatingRef = useRef(false);
    const { editorMode, physicsState, currentScene } = useEditorStore();

    // Get initial object data from GameWorld
    const obj = gameWorld.getObject(objectId);

    // Register Three.js object with GameWorld
    useEffect(() => {
      const group = groupRef.current;
      if (group) {
        gameWorld.registerThreeObject(objectId, group);
        return () => {
          gameWorld.unregisterThreeObject(objectId);
        };
      }
    }, [gameWorld, objectId]);

    // Memoize derived values to prevent recalculation
    const isSelected = useMemo(
      () => selectedObjects.includes(objectId),
      [selectedObjects, objectId],
    );
    const shouldShowHelpers = useMemo(
      () => isSelected && physicsState !== "playing",
      [isSelected, physicsState],
    );

    // Get object properties (with fallbacks for when object doesn't exist)
    const { transform, components, children, visible, tags } = obj || {
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [],
      children: [],
      visible: false,
      tags: [] as string[]
    };

    // Check if this is a utility object that should remain empty
    const isUtilityObject = useMemo(
      () => tags?.includes('utility') || false,
      [tags],
    );

    // Memoize physics component separation
    const { rigidBodyComp, regularComponents } = useMemo(
      () => separatePhysicsComponents(components),
      [components],
    );

    const hasRigidBody = useMemo(() => Boolean(rigidBodyComp), [rigidBodyComp]);
    const isControlledByPivot = useMemo(
      () => isSelected && editorMode !== "select",
      [isSelected, editorMode],
    );
    const isPivotControlsActive = isControlledByPivot;

    // Memoize effective components - avoid default mesh for utility objects
    const effectiveComponents = useMemo(
      () => {
        if (components.length > 0) {
          return regularComponents;
        }
        
        // Don't create default mesh for utility objects (empty objects, groups, etc.)
        if (isUtilityObject) {
          return [];
        }
        
        // Create default mesh for other objects with no components
        return [createDefaultMeshComponent(isSelected, renderType)];
      },
      [components.length, regularComponents, isUtilityObject, isSelected, renderType],
    );

    // Memoize transform for physics wrapper
    const transformForPhysics = useMemo(() => {
      const liveTransform = gameWorld.getObjectTransform(objectId);
      return liveTransform || transform; // Fallback to GameObject transform if not found
    }, [gameWorld, objectId, transform]);

    // Optimized matrix change handler
    const handleMatrixChange = useCallback((matrix: THREE.Matrix4) => {
      matrixRef.current.copy(matrix);
    }, []);

    // Optimized click handler
    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        onSelect(objectId);
      },
      [onSelect, objectId],
    );

    // Memoize group props
    const shouldApplyTransform = useMemo(
      () => shouldApplyTransformToGroup(hasRigidBody, isControlledByPivot),
      [hasRigidBody, isControlledByPivot],
    );

    // Check if this entity has script components
    const hasScriptComponents = useMemo(
      () => components.some(comp => comp.type === "script"),
      [components]
    );

    const pos = useRef(new THREE.Vector3());
    const quat = useRef(new THREE.Quaternion());
    const scl = useRef(new THREE.Vector3());

    // High-frequency transform updates from GameWorld
    useFrame(() => {
      const group = groupRef.current;
      if (!group || !shouldApplyTransform) return;

      // During physics or high-frequency mode, read live transforms from GameWorld
      if (physicsState === 'playing') {
        const liveTransform = gameWorld.getLiveTransform(objectId);
        if (liveTransform) {
          // Apply live transform directly to Three.js object (bypassing React)
          const position = pos.current;
          const quaternion = quat.current;
          const scale = scl.current;
          liveTransform.decompose(position, quaternion, scale);
          
          group.position.copy(position);
          group.quaternion.copy(quaternion);
          group.scale.copy(scale);
        }
      } else {
        // During editor mode, use GameObject transforms
        const currentTransform = gameWorld.getObjectTransform(objectId);
        if (currentTransform) {
          const { position, rotation, scale } = currentTransform;
          group.position.set(position.x, position.y, position.z);
          group.rotation.set(rotation.x, rotation.y, rotation.z);
          group.scale.set(scale.x, scale.y, scale.z);
        }
      }
    });

    const groupProps = useMemo(() => {
      return {
        ref: isSelected ? ref || groupRef : groupRef,
        onClick: handleClick,
        userData: { objectId },
        // Don't set initial transform here - will be handled by useFrame
      };
    }, [isSelected, ref, handleClick, objectId]);

    // Early returns after all hooks
    if (!obj || !visible) return null;

    return (
      <>
        <TransformManager
          transform={transform}
          isManipulating={isManipulatingRef.current}
          onMatrixChange={handleMatrixChange}
        />
        <PivotControlsWrapper
          isSelected={isSelected}
          objectId={objectId}
        >
          <group {...groupProps}>
            {/* Add script executor for entities with script components */}
            {hasScriptComponents && currentScene && (
              <ScriptExecutor entity={obj} scene={currentScene} />
            )}
            
            {isPivotControlsActive ? (
              // When pivot controls are active, treat exactly like non-physics object
              <VisualContentRenderer
                components={effectiveComponents}
                children={children || []}
                selectedObjects={selectedObjects}
                onSelect={onSelect}
                showHelpers={shouldShowHelpers}
                renderType={renderType}
                objectId={objectId}
              />
            ) : (
              // When pivot controls are not active, use normal physics logic
              <PhysicsWrapper
                objectId={objectId}
                transform={transformForPhysics}
                components={components}
                isPivotControlsActive={isPivotControlsActive}
              >
                <VisualContentRenderer
                  components={effectiveComponents}
                  children={children || []}
                  selectedObjects={selectedObjects}
                  onSelect={onSelect}
                  showHelpers={shouldShowHelpers}
                  renderType={renderType}
                  objectId={objectId}
                />
              </PhysicsWrapper>
            )}
          </group>
        </PivotControlsWrapper>
      </>
    );
  },
);

SceneObject.displayName = "SceneObject";

export default React.memo(SceneObject);