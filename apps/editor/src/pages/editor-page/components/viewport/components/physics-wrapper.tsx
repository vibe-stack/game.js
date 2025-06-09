import React, { useMemo } from "react";
import RigidBodyRenderer from "../physics/rigid-body-renderer";
import ColliderRenderer from "../physics/collider-renderer";

interface PhysicsWrapperProps {
  objectId: string;
  transform: Transform;
  components: (GameObjectComponent | PhysicsComponent)[];
  children: React.ReactNode;
  isPivotControlsActive: boolean;
}

// Simple error boundary for physics components
class PhysicsComponentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Physics component error:', error);
  }

  render() {
    if (this.state.hasError) {
      // Render children without physics wrapper when error occurs
      return <>{this.props.children}</>;
    }

    return this.props.children;
  }
}

const PhysicsWrapper: React.FC<PhysicsWrapperProps> = ({
  objectId,
  transform,
  components,
  children,
  isPivotControlsActive,
}) => {
  // Memoize component separation to avoid recalculation
  const { rigidBodyComp, colliderComponents, jointComponents } = useMemo(() => {
    const rigidBodyComp = components.find(comp => comp.type === 'rigidBody') as RigidBodyComponent | undefined;
    const colliderComponents = components.filter(comp => comp.type === 'collider') as ColliderComponent[];
    const jointComponents = components.filter(comp => comp.type === 'joint') as JointComponent[];
    
    return { rigidBodyComp, colliderComponents, jointComponents };
  }, [components]);

  // Log joint components for debugging (TODO: implement joint rendering)
  React.useEffect(() => {
    if (jointComponents.length > 0) {
      console.log(`Object ${objectId} has ${jointComponents.length} joint components - joint rendering not yet implemented`);
    }
  }, [jointComponents.length, objectId]);

  // If there's a rigid body AND pivot controls are NOT active, wrap with RigidBodyRenderer
  if (rigidBodyComp && !isPivotControlsActive) {
    return (
      <PhysicsComponentErrorBoundary>
        <RigidBodyRenderer
          objectId={objectId}
          transform={transform}
          rigidBodyComponent={rigidBodyComp}
          colliderComponents={colliderComponents}
        >
          {children}
        </RigidBodyRenderer>
      </PhysicsComponentErrorBoundary>
    );
  }

  // If pivot controls are active with rigid body, skip physics to avoid conflicts
  if (isPivotControlsActive && rigidBodyComp) {
    return <>{children}</>;
  }

  // If no rigid body but has colliders (static colliders), wrap with ColliderRenderer
  // Skip colliders when pivot controls are active to avoid conflicts
  if (!isPivotControlsActive && colliderComponents.length > 0) {
    return (
      <PhysicsComponentErrorBoundary>
        {colliderComponents.reduce((acc, colliderComponent) => (
          <ColliderRenderer 
            colliderComponent={colliderComponent}
            transform={transform}
          >
            {acc}
          </ColliderRenderer>
        ), children as React.ReactElement)}
      </PhysicsComponentErrorBoundary>
    );
  }

  return <>{children}</>;
};

export default React.memo(PhysicsWrapper); 