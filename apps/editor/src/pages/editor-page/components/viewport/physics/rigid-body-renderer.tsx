import React, { useEffect, useRef, useState } from "react";
import {
  RigidBody,
  RapierRigidBody,
  useAfterPhysicsStep,
} from "@react-three/rapier";
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

const euler = new THREE.Euler(0, 0, 0, "XYZ");
const quaternion = new THREE.Quaternion().setFromEuler(euler);

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
    isRegistered,
  ]);

  // Handle physics updates using useFrame
  useAfterPhysicsStep(() => {
    if (!rigidBodyRef.current || !isRegistered || physicsState !== "playing")
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

      quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

      // Convert quaternion to euler angles with consistent rotation order
      euler.setFromQuaternion(quaternion, "XYZ");

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
