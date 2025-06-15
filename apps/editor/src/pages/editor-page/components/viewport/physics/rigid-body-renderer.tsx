import React, { useRef, useCallback } from "react";
import {
  RigidBody,
  RapierRigidBody,
} from "@react-three/rapier";
import { usePhysics } from "./physics-context";
import ColliderRenderer from "./collider-renderer";

interface RigidBodyRendererProps {
  objectId: string;
  transform: Transform;
  rigidBodyComponent: RigidBodyComponent;
  colliderComponents?: ColliderComponent[];
  children: React.ReactNode;
}

export default function RigidBodyRenderer({
  objectId,
  transform,
  rigidBodyComponent,
  colliderComponents = [],
  children,
}: RigidBodyRendererProps) {
  const {
    registerRigidBody,
    unregisterRigidBody,
    isInitialized,
    physicsState,
    resetKey,
  } = usePhysics();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
  // The ref callback pattern is more robust for managing registration and unregistration.
  // It fires once when the ref is attached, and once with `null` when it's detached (unmounted).
  const handleRef = useCallback((rb: RapierRigidBody | null) => {
    rigidBodyRef.current = rb;
    if (rb) {
      // Component mounted, register the rigid body.
      if (rigidBodyComponent.enabled && isInitialized) {
        registerRigidBody(objectId, rb);
      }
    } else {
      // Component unmounted, unregister the rigid body.
      // This is safer than useEffect cleanup during complex state transitions.
      unregisterRigidBody(objectId);
    }
  }, [
    objectId,
    registerRigidBody,
    unregisterRigidBody,
    rigidBodyComponent.enabled, // Re-run if component is enabled/disabled
    isInitialized,
  ]);

  // REMOVED: useAfterPhysicsStep hook that was causing the feedback loop
  // The RigidBody component will automatically manage transforms during physics simulation

  if (!rigidBodyComponent.enabled) {
    return <group>{children}</group>;
  }

  const props = rigidBodyComponent.properties;

  // Dynamically determine body type based on physics state
  // When not playing, make dynamic bodies kinematic to prevent movement
  // Static and kinematic bodies keep their original type

  // Only change dynamic bodies to kinematic when not playing
  // Static bodies should remain kinematic regardless of physics state
  const effectiveBodyType = 
    physicsState === 'playing' && props.bodyType === "dynamic" 
      ? "dynamic" 
      : "kinematicPosition";

  // Check if any translation is locked
  const hasLockedTranslations =
    props.lockTranslations.x ||
    props.lockTranslations.y ||
    props.lockTranslations.z;
  // Check if any rotation is locked
  const hasLockedRotations =
    props.lockRotations.x || props.lockRotations.y || props.lockRotations.z;

  return (
    <RigidBody
      key={`${objectId}-${resetKey}`}
      ref={handleRef}
      type={effectiveBodyType}
      position={[
        transform.position.x,
        transform.position.y,
        transform.position.z,
      ]}
      rotation={[
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
      ]}
      scale={[transform.scale.x, transform.scale.y, transform.scale.z]}
      mass={props.mass}
      linearDamping={props.linearDamping}
      angularDamping={props.angularDamping}
      gravityScale={props.gravityScale}
      canSleep={props.canSleep}
      lockTranslations={hasLockedTranslations}
      lockRotations={hasLockedRotations}
      dominanceGroup={props.dominanceGroup}
      colliders={false}
    >
      {/* Render colliders as direct children of RigidBody */}
      {colliderComponents.map((colliderComponent) => (
        <ColliderRenderer
          key={colliderComponent.id}
          colliderComponent={colliderComponent}
          objectId={objectId}
        >
          <></>
        </ColliderRenderer>
      ))}

      {/* Apply scale to the visual content inside the rigid body */}
      <group scale={[transform.scale.x, transform.scale.y, transform.scale.z]}>
        {children}
      </group>
    </RigidBody>
  );
}
