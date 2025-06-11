// Map combine rules to rapier constants
export const mapCombineRule = (rule: string) => {
  switch (rule) {
    case "average":
      return 0; // Average
    case "min":
      return 1; // Min
    case "multiply":
      return 2; // Multiply
    case "max":
      return 3; // Max
    default:
      return 0; // Default to average
  }
};

// Helper function to pack collision groups (membership and filter) into a single number
// Following Rapier's format: 16 left-most bits = membership, 16 right-most bits = filter
export const packCollisionGroups = (membership: number, filter: number): number => {
  return (membership << 16) | (filter & 0xffff);
};

// Helper function to find an object in the scene hierarchy
export const findObjectInScene = (objects: GameObject[], objectId: string): GameObject | null => {
  for (const obj of objects) {
    if (obj.id === objectId) return obj;
    const found = findObjectInScene(obj.children, objectId);
    if (found) return found;
  }
  return null;
};

// Generate common props for all colliders
export const generateCommonColliderProps = (props: ColliderComponent['properties']) => {
  const packedCollisionGroups = packCollisionGroups(
    props.collisionGroups.membership,
    props.collisionGroups.filter,
  );
  const packedSolverGroups = packCollisionGroups(
    props.solverGroups.membership,
    props.solverGroups.filter,
  );

  return {
    sensor: props.isSensor,
    density: props.density,
    friction: props.material.friction,
    restitution: props.material.restitution,
    frictionCombineRule: mapCombineRule(props.material.frictionCombineRule),
    restitutionCombineRule: mapCombineRule(props.material.restitutionCombineRule),
    collisionGroups: packedCollisionGroups,
    solverGroups: packedSolverGroups,
    contactForceEventThreshold: props.contactForceEventThreshold,
  };
}; 