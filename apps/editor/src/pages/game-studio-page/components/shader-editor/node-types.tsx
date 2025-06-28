import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DragInput } from '@/components/ui/drag-input';

// Base node component
const BaseNode = ({ data, selected, children }: any) => {
  return (
    <Card className={`min-w-[150px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{data.label || data.type}</span>
          <Badge variant="secondary" className="text-xs">
            {data.type}
          </Badge>
        </div>
        {children}
      </div>
    </Card>
  );
};

// Input Nodes
export const UVNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="source" position={Position.Right} id="uv" />
    </BaseNode>
  );
};

export const TimeNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

export const PositionNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="source" position={Position.Right} id="position" />
    </BaseNode>
  );
};

export const NormalNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="source" position={Position.Right} id="normal" />
    </BaseNode>
  );
};

// Math Nodes
export const MathNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="target" position={Position.Left} id="a" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} id="result" />
    </BaseNode>
  );
};

export const UnaryMathNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="target" position={Position.Left} id="value" />
      <Handle type="source" position={Position.Right} id="result" />
    </BaseNode>
  );
};

// Value Nodes
export const FloatNode = (props: NodeProps) => {
  const [value, setValue] = React.useState(props.data.value || 0);

  return (
    <BaseNode {...props}>
      <DragInput
        value={value}
        onChange={(v) => {
          setValue(v);
          props.data.value = v;
        }}
        className="w-full"
      />
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

export const Vec2Node = (props: NodeProps) => {
  const [x, setX] = React.useState(props.data.x || 0);
  const [y, setY] = React.useState(props.data.y || 0);

  return (
    <BaseNode {...props}>
      <div className="space-y-2">
        <DragInput
          value={x}
          onChange={(v) => {
            setX(v);
            props.data.x = v;
          }}
          className="w-full"
        />
        <DragInput
          value={y}
          onChange={(v) => {
            setY(v);
            props.data.y = v;
          }}
          className="w-full"
        />
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

export const Vec3Node = (props: NodeProps) => {
  const [x, setX] = React.useState(props.data.x || 0);
  const [y, setY] = React.useState(props.data.y || 0);
  const [z, setZ] = React.useState(props.data.z || 0);

  return (
    <BaseNode {...props}>
      <div className="space-y-2">
        <DragInput
          value={x}
          onChange={(v) => {
            setX(v);
            props.data.x = v;
          }}
          className="w-full"
        />
        <DragInput
          value={y}
          onChange={(v) => {
            setY(v);
            props.data.y = v;
          }}
          className="w-full"
        />
        <DragInput
          value={z}
          onChange={(v) => {
            setZ(v);
            props.data.z = v;
          }}
          className="w-full"
        />
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

// Texture Node
export const TextureNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="target" position={Position.Left} id="uv" />
      <div className="text-xs text-muted-foreground">
        {props.data.texturePath || 'No texture'}
      </div>
      <Handle type="source" position={Position.Right} id="color" />
    </BaseNode>
  );
};

// Uniform Node
export const UniformNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <div className="text-xs text-muted-foreground">
        {props.data.uniformName || 'uniform'}
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

// Output Node
export const OutputNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="target" position={Position.Left} id="input" />
      <div className="text-xs text-muted-foreground">
        Stage: {props.data.stage || 'fragment'}
      </div>
    </BaseNode>
  );
};

// Default Node
export const DefaultNode = (props: NodeProps) => {
  return (
    <BaseNode {...props}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

// Export node types mapping
export const nodeTypes = {
  // Input nodes
  uv: UVNode,
  time: TimeNode,
  position: PositionNode,
  normal: NormalNode,
  cameraPosition: PositionNode,
  cameraViewDirection: NormalNode,
  
  // Math nodes
  add: MathNode,
  subtract: MathNode,
  multiply: MathNode,
  divide: MathNode,
  dot: MathNode,
  cross: MathNode,
  mix: MathNode,
  sin: UnaryMathNode,
  cos: UnaryMathNode,
  pow: MathNode,
  sqrt: UnaryMathNode,
  normalize: UnaryMathNode,
  clamp: MathNode,
  smoothstep: MathNode,
  
  // Value nodes
  float: FloatNode,
  vec2: Vec2Node,
  vec3: Vec3Node,
  vec4: Vec3Node, // Reuse Vec3 for now
  rgb: Vec3Node,
  rgba: Vec3Node,
  
  // Other nodes
  texture: TextureNode,
  cubeTexture: TextureNode,
  uniform: UniformNode,
  varying: DefaultNode,
  output: OutputNode,
  
  // Default fallback
  default: DefaultNode,
}; 