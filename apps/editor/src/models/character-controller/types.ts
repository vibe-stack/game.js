export interface CharacterControllerConfig {
    // Capsule collider setup
    capsuleHalfHeight: number;
    capsuleRadius: number;
    
    // Collider positioning - offset from the entity's origin
    colliderOffset: THREE.Vector3;
    
    // Movement physics
    maxSpeed: number;
    acceleration: number;
    jumpForce: number;
    sprintMultiplier: number;
    
    // Crouch and Slide mechanics
    crouchSpeedMultiplier: number; // Speed reduction when crouching (0-1)
    slideSpeedMultiplier: number; // Speed boost when sliding (usually > 1)
    slideDuration: number; // Max time for sliding in seconds
    slideDeceleration: number; // How quickly slide speed decreases
    crouchHeightReduction: number; // How much to reduce capsule height when crouching (0-1)
    slideMinSpeed: number; // Minimum speed required to start sliding
    
    // Advanced movement mechanics (CS-like)
    airAcceleration: number; // Air strafe acceleration
    airMaxSpeed: number; // Maximum air strafe speed
    groundFriction: number; // Friction when on ground
    airFriction: number; // Air resistance
    stopSpeed: number; // Speed below which extra friction is applied
    slopeFriction: number; // Friction on slopes
    slideThreshold: number; // Angle at which sliding starts (radians)
    momentumPreservation: number; // How much momentum is preserved (0-1)
    strafeResponseiveness: number; // How responsive air strafing is
    
    // Velocity and physics
    maxVelocity: number; // Maximum allowed velocity magnitude
    velocityDamping: number; // General velocity damping factor
    bounceVelocityRetention: number; // How much velocity is kept after bouncing
    
    // Jump mechanics
    preSpeedBoost: number; // Speed boost before jumping
    jumpWhileSliding: boolean; // Allow jumping while sliding on slopes
    bunnyHopTolerance: number; // Time window for bunny hopping
    
    // Moving platform and collision response
    enableMovingPlatforms: boolean; // Whether to inherit velocity from moving platforms
    enableMovingBodyPush: boolean; // Whether moving static bodies can push the character
    movingPlatformMaxDistance: number; // Max distance to consider for moving platform detection
    movingBodyPushForce: number; // Multiplier for push force from moving bodies
    
    // Character controller settings
    offset: number; // Gap between character and environment
    maxSlopeClimbAngle: number; // in radians
    minSlopeSlideAngle: number; // in radians
    autoStepMaxHeight: number;
    autoStepMinWidth: number;
    autoStepIncludeDynamic: boolean;
    snapToGroundDistance: number;
    
    // Physics forces
    gravityScale: number;
    maxFallSpeed: number;
    
    // Camera settings
    cameraMode: "first-person" | "third-person";
    cameraDistance: number;
    cameraHeight: number;
    cameraMinDistance: number;
    cameraMaxDistance: number;
    cameraUpLimit: number; // in radians
    cameraDownLimit: number; // in radians
    cameraSensitivity: number;
    
    // Animation settings
    idleAnimation?: string;
    walkAnimation?: string;
    sprintAnimation?: string;
    jumpAnimation?: string;
    fallAnimation?: string;
    crouchAnimation?: string;
    slideAnimation?: string;
  }