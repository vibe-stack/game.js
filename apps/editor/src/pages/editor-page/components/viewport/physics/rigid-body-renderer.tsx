import React, { useEffect, useRef } from 'react';
import { usePhysics } from './physics-context';
import * as THREE from 'three';

interface RigidBodyRendererProps {
  objectId: string;
  transform: Transform;
  rigidBodyComponent: RigidBodyComponent;
  children: React.ReactNode;
}

export default function RigidBodyRenderer({
  objectId,
  transform,
  rigidBodyComponent,
  children
}: RigidBodyRendererProps) {
  const { world, registerRigidBody, unregisterRigidBody, physicsState } = usePhysics();
  const rigidBodyRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (!world || !rigidBodyComponent.enabled) return;

    const initRigidBody = async () => {
      try {
        const RAPIER = await import('@dimforge/rapier3d-compat');
        
        // Create rigid body descriptor
        let rigidBodyDesc;
        switch (rigidBodyComponent.properties.bodyType) {
          case 'dynamic':
            rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
            break;
          case 'static':
            rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
            break;
          case 'kinematic':
            rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
            break;
          default:
            rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
        }

        // Set initial position and rotation
        rigidBodyDesc.setTranslation(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );

        // Convert euler to quaternion for rotation
        const euler = new THREE.Euler(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z
        );
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        rigidBodyDesc.setRotation({
          x: quaternion.x,
          y: quaternion.y,
          z: quaternion.z,
          w: quaternion.w
        });

        // Apply properties
        const props = rigidBodyComponent.properties;
        
        if (props.mass !== undefined && props.bodyType === 'dynamic') {
          rigidBodyDesc.setAdditionalMass(props.mass);
        }
        
        rigidBodyDesc.setLinearDamping(props.linearDamping);
        rigidBodyDesc.setAngularDamping(props.angularDamping);
        rigidBodyDesc.setGravityScale(props.gravityScale);
        rigidBodyDesc.setCanSleep(props.canSleep);
        
        // Set lock constraints
        if (props.lockTranslations.x || props.lockTranslations.y || props.lockTranslations.z) {
          rigidBodyDesc.lockTranslations();
        }
        if (props.lockRotations.x || props.lockRotations.y || props.lockRotations.z) {
          rigidBodyDesc.lockRotations();
        }

        // Create the rigid body
        const rigidBody = world.createRigidBody(rigidBodyDesc);
        rigidBodyRef.current = rigidBody;
        
        registerRigidBody(objectId, rigidBody);

      } catch (error) {
        console.error('Failed to create rigid body:', error);
      }
    };

    initRigidBody();

    return () => {
      if (rigidBodyRef.current) {
        world.removeRigidBody(rigidBodyRef.current);
        unregisterRigidBody(objectId);
        rigidBodyRef.current = null;
      }
    };
  }, [world, rigidBodyComponent, objectId, registerRigidBody, unregisterRigidBody, transform]);

  // Update rigid body properties when component changes
  useEffect(() => {
    if (!rigidBodyRef.current || physicsState === 'playing') return;

    const rigidBody = rigidBodyRef.current;
    const props = rigidBodyComponent.properties;

    // Update transform
    rigidBody.setTranslation({
      x: transform.position.x,
      y: transform.position.y,
      z: transform.position.z
    }, true);

    const euler = new THREE.Euler(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    rigidBody.setRotation({
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    }, true);

    // Update properties
    rigidBody.setLinearDamping(props.linearDamping);
    rigidBody.setAngularDamping(props.angularDamping);
    rigidBody.setGravityScale(props.gravityScale);
    
  }, [rigidBodyComponent, transform, physicsState]);

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
} 