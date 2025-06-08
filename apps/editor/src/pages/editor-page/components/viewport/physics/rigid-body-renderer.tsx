import React, { useEffect, useRef, useState } from "react";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { usePhysics } from "./physics-context";
import ColliderRenderer from "./collider-renderer";
import * as THREE from "three";

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
    physicsState,
    registerRigidBody,
    unregisterRigidBody,
    updateTransformFromPhysics,
  } = usePhysics();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Register/unregister rigid body
  useEffect(() => {
    const rigidBody = rigidBodyRef.current;
    if (rigidBody && rigidBodyComponent.enabled && !isRegistered) {
      // Set initial transform immediately after creation
      rigidBody.setTranslation(transform.position, true);

      const euler = new THREE.Euler(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
      );
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      rigidBody.setRotation(quaternion, true);

      // Reset velocities
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

      registerRigidBody(objectId, rigidBody);
      setIsRegistered(true);

      return () => {
        if (isRegistered) {
          unregisterRigidBody(objectId);
          setIsRegistered(false);
        }
      };
    }
  }, [
    objectId,
    registerRigidBody,
    unregisterRigidBody,
    rigidBodyComponent.enabled,
    transform,
    isRegistered,
  ]);

  // Update transforms when physics is not playing
  useEffect(() => {
    if (physicsState === "playing" || !rigidBodyRef.current || !isRegistered)
      return;

    const rigidBody = rigidBodyRef.current;

    try {
      // Always update the rigid body position and rotation when transform changes
      rigidBody.setTranslation(transform.position, true);

      // Update rotation (convert euler to quaternion)
      const euler = new THREE.Euler(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
      );
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      rigidBody.setRotation(quaternion, true);

      // Reset velocities when manually positioning
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    } catch (error) {
      console.warn("Failed to update rigid body transform:", error);
    }
  }, [
    transform.position.x,
    transform.position.y,
    transform.position.z,
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    physicsState,
    isRegistered,
    objectId,
  ]);

  // Handle physics updates using useFrame
  useFrame(() => {
    if (!rigidBodyRef.current || physicsState !== "playing" || !isRegistered)
      return;

    try {
      const rigidBody = rigidBodyRef.current;
      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();

      const position: Vector3 = {
        x: translation.x,
        y: translation.y,
        z: translation.z,
      };

      // Convert quaternion to euler angles
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
      );

      const rotationEuler: Vector3 = {
        x: euler.x,
        y: euler.y,
        z: euler.z,
      };

      updateTransformFromPhysics(objectId, position, rotationEuler);
    } catch {
      // Silently ignore errors during physics updates to prevent spam
    }
  });

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
      // Set initial position and rotation - RigidBody will be the transform owner
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
