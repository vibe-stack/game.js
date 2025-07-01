import * as THREE from "three/webgpu";
import { CharacterControllerConfig } from "./types";

// Default configurations for common use cases
export const FPS_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
    cameraMode: "first-person",
    cameraDistance: 0,
    cameraHeight: 1.7,
    colliderOffset: new THREE.Vector3(0, 0, 0),
    maxSpeed: 10.0,
    acceleration: 80.0,
    jumpForce: 15.0,
    cameraSensitivity: 0.002,
    snapToGroundDistance: 0.05,
    
    // Crouch and Slide mechanics for FPS
    crouchSpeedMultiplier: 0.4,
    slideSpeedMultiplier: 1.8,
    slideDuration: 1.2,
    slideDeceleration: 0.8,
    crouchHeightReduction: 0.4,
    slideMinSpeed: 6.0,
    
    // CS-style movement for FPS
    airAcceleration: 50.0,
    airMaxSpeed: 35.0,
    groundFriction: 6.0,
    airFriction: 0.02,
    stopSpeed: 1.0,
    slopeFriction: 3.0,
    slideThreshold: Math.PI / 6,
    momentumPreservation: 0.98,
    strafeResponseiveness: 1.2,
    maxVelocity: 60.0,
    velocityDamping: 0.995,
    bounceVelocityRetention: 0.9,
    preSpeedBoost: 1.3,
    jumpWhileSliding: true,
    bunnyHopTolerance: 0.15,
  };
  
  export const THIRD_PERSON_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
    cameraMode: "third-person",
    cameraDistance: -8.0,
    cameraHeight: 2.0,
    colliderOffset: new THREE.Vector3(0, 0, 0),
    maxSpeed: 6.0,
    acceleration: 50.0,
    jumpForce: 12.0,
    cameraSensitivity: 0.002,
    
    // Crouch and Slide mechanics for third-person
    crouchSpeedMultiplier: 0.5,
    slideSpeedMultiplier: 1.5,
    slideDuration: 1.0,
    slideDeceleration: 0.6,
    crouchHeightReduction: 0.3,
    slideMinSpeed: 4.0,
    
    // CS-style movement for third-person
    airAcceleration: 40.0,
    airMaxSpeed: 25.0,
    groundFriction: 8.0,
    airFriction: 0.05,
    stopSpeed: 1.0,
    slopeFriction: 2.5,
    slideThreshold: Math.PI / 6,
    momentumPreservation: 0.95,
    strafeResponseiveness: 0.8,
    maxVelocity: 45.0,
    velocityDamping: 0.98,
    bounceVelocityRetention: 0.85,
    preSpeedBoost: 1.2,
    jumpWhileSliding: true,
    bunnyHopTolerance: 0.12,
  };
  
  export const PLATFORMER_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
    cameraMode: "third-person",
    cameraDistance: -12.0,
    cameraHeight: 3.0,
    colliderOffset: new THREE.Vector3(0, 0, 0),
    maxSpeed: 8.0,
    acceleration: 60.0,
    jumpForce: 18.0,
    cameraSensitivity: 0.0015,
    autoStepMaxHeight: 0.8,
    snapToGroundDistance: 0.5,
    
    // CS-style movement for platformer
    airAcceleration: 45.0,
    airMaxSpeed: 30.0,
    groundFriction: 5.0,
    airFriction: 0.01,
    stopSpeed: 1.0,
    slopeFriction: 1.5,
    slideThreshold: Math.PI / 6,
    momentumPreservation: 0.97,
    strafeResponseiveness: 0.9,
    maxVelocity: 50.0,
    velocityDamping: 0.99,
    bounceVelocityRetention: 0.9,
    preSpeedBoost: 1.4,
    jumpWhileSliding: true,
    bunnyHopTolerance: 0.18,
  };
  
  export const CS_SURF_CHARACTER_CONFIG: Partial<CharacterControllerConfig> = {
    cameraMode: "first-person",
    cameraDistance: 0,
    cameraHeight: 1.7,
    colliderOffset: new THREE.Vector3(0, 0, 0),
    maxSpeed: 12.0,
    acceleration: 60.0,
    jumpForce: 18.0,
    cameraSensitivity: 0.0025,
    snapToGroundDistance: 0.02,
    
    // Optimized for surfing and air strafing
    airAcceleration: 100.0,
    airMaxSpeed: 80.0,
    groundFriction: 4.0,
    airFriction: 0.001,
    stopSpeed: 0.5,
    slopeFriction: 0.5, // Very low for smooth sliding
    slideThreshold: Math.PI / 8, // 22.5 degrees - allows sliding on gentler slopes
    momentumPreservation: 0.99,
    strafeResponseiveness: 2.0, // High for precise air control
    maxVelocity: 120.0,
    velocityDamping: 0.998,
    bounceVelocityRetention: 0.95,
    preSpeedBoost: 1.5,
    jumpWhileSliding: true,
    bunnyHopTolerance: 0.2,
  };