export interface GeometryControlProps {
  geometryProps: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
} 