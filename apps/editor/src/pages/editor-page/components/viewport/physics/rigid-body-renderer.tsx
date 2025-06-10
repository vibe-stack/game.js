import React, { useEffect, useRef, useState } from "react";
import {
  RigidBody,
  RapierRigidBody,
} from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
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
  const frozenPositionRef = useRef<[number, number, number] | null>(null);
  const frozenRotationRef = useRef<[number, number, number, number] | null>(null);

  // Control rigid body movement based on physics state
  useFrame(() => {
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody) return;

    if (physicsState === 'paused') {
      // When paused, freeze the rigid body in place
      if (frozenPositionRef.current === null) {
        // Store the current position and rotation when first pausing
        const pos = rigidBody.translation();
        const rot = rigidBody.rotation();
        frozenPositionRef.current = [pos.x, pos.y, pos.z];
        frozenRotationRef.current = [rot.x, rot.y, rot.z, rot.w];
      }

      // Reset position and rotation to frozen values
      rigidBody.setTranslation(
        { x: frozenPositionRef.current[0], y: frozenPositionRef.current[1], z: frozenPositionRef.current[2] },
        true
      );
      rigidBody.setRotation(
        { x: frozenRotationRef.current![0], y: frozenRotationRef.current![1], z: frozenRotationRef.current![2], w: frozenRotationRef.current![3] },
        true
      );
      
      // Reset all velocities to prevent any movement
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    } else if (physicsState === 'stopped') {
      // When stopped, just prevent any movement - let physics context handle position restoration
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      // Clear frozen state since we're not frozen, just stopped
      frozenPositionRef.current = null;
      frozenRotationRef.current = null;
    } else if (physicsState === 'playing') {
      // When playing, clear frozen state so physics can take over
      frozenPositionRef.current = null;
      frozenRotationRef.current = null;
    }
  });

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

  // Map body types to @react-three/rapier types
  const bodyType =
    props.bodyType === "static"
      ? "fixed"
      : props.bodyType === "kinematic"
        ? "kinematicPosition"
        : "dynamic";

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
      type={bodyType}
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
