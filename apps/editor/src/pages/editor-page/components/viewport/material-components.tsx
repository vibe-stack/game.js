export function getMaterialComponent(type: string) {
  switch (type) {
    case "standard":
      return ({
        color = "#orange",
        metalness = 0,
        roughness = 1,
        ...props
      }) => (
        <meshStandardMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          {...props}
        />
      );
    case "basic":
      return ({ color = "#orange", ...props }) => (
        <meshBasicMaterial color={color} {...props} />
      );
    case "phong":
      return ({ color = "#orange", shininess = 100, ...props }) => (
        <meshPhongMaterial color={color} shininess={shininess} {...props} />
      );
    case "lambert":
      return ({ color = "#orange", ...props }) => (
        <meshLambertMaterial color={color} {...props} />
      );
    case "physical":
      return ({
        color = "#orange",
        metalness = 0,
        roughness = 1,
        ...props
      }) => (
        <meshPhysicalMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          {...props}
        />
      );
    default:
      return ({ color = "#orange", ...props }) => (
        <meshStandardMaterial color={color} {...props} />
      );
  }
} 