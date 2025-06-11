import React, { useEffect, useRef, useState } from "react";
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
  } = usePhysics();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const cleanupExecutedRef = useRef(false);

  // Register/unregister rigid body with improved cleanup logic
  useEffect(() => {
    const rigidBody = rigidBodyRef.current;
    
    if (rigidBody && rigidBodyComponent.enabled && !isRegistered && isInitialized) {
      registerRigidBody(objectId, rigidBody);
      setIsRegistered(true);
      cleanupExecutedRef.current = false;
    }

    return () => {
      // Only execute cleanup once and only if we were actually registered
      if (isRegistered && !cleanupExecutedRef.current) {
        cleanupExecutedRef.current = true;
        
        // Use a timeout to defer cleanup until after React's current render cycle
        // This prevents conflicts with physics world state changes
        setTimeout(() => {
          try {
            // Only attempt cleanup if physics is still initialized
            if (isInitialized) {
              unregisterRigidBody(objectId);
            }
          } catch {
            // Silently ignore cleanup errors - they typically happen when 
            // the physics world is already being destroyed
          }
        }, 0);
        
        setIsRegistered(false);
      }
    };
  }, [
    objectId,
    registerRigidBody,
    unregisterRigidBody,
    rigidBodyComponent.enabled,
    isRegistered,
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
      ref={rigidBodyRef}
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
