import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import useGameStudioStore from '@/stores/game-studio-store';
import { shaderManager, TSLShaderConfig, ShaderType, getExampleShaderIds, getExampleShader } from '@/models';
import { ShaderApplicationService } from '@/services/shader-application-service';
import { ShaderNodeLibrary } from './shader-node-library';
import { ShaderPreview } from './shader-preview';
import { ShaderParameters } from './shader-parameters';
import { nodeTypes } from './node-types';

// Helper function to get readable node labels
const getNodeLabel = (nodeType: string): string => {
  const labels: Record<string, string> = {
    uv: "UV Coordinates",
    time: "Time",
    position: "Position",
    normal: "Normal",
    cameraPosition: "Camera Position",
    cameraViewDirection: "View Direction", 
    add: "Add",
    subtract: "Subtract",
    multiply: "Multiply",
    divide: "Divide",
    dot: "Dot Product",
    cross: "Cross Product",
    mix: "Mix/Lerp",
    sin: "Sine",
    cos: "Cosine",
    pow: "Power",
    sqrt: "Square Root",
    normalize: "Normalize",
    clamp: "Clamp",
    smoothstep: "Smooth Step",
    float: "Float",
    vec2: "Vector2",
    vec3: "Vector3",
    vec4: "Vector4",
    rgb: "RGB Color",
    rgba: "RGBA Color",
    texture: "Texture Sample",
    uniform: "Uniform",
    output: "Output"
  };
  return labels[nodeType] || nodeType;
};

interface ShaderEditorProps {
  initialShaderId?: string;
  onClose?: () => void;
}

export function ShaderEditor({ initialShaderId, onClose }: ShaderEditorProps) {
  const { shaderEditorOpen, setShaderEditorOpen, setSelectedShaderId } = useGameStudioStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedShader, setSelectedShader] = useState<string | null>(initialShaderId || null);
  const [shaderName, setShaderName] = useState('New Shader');
  const [shaderType, setShaderType] = useState<ShaderType>('material');
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  useEffect(() => {
    if (initialShaderId) {
      loadShader(initialShaderId);
    }
  }, [initialShaderId]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (!type || !reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { label: type }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const loadShader = (shaderId: string) => {
    const shader = shaderManager.getShader(shaderId);
    if (!shader) return;

    setSelectedShader(shaderId);
    setShaderName(shader.name);
    setShaderType(shader.type);

    // Convert shader graph to ReactFlow nodes/edges
    if (shader.graph) {
      const flowNodes = shader.graph.nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        data: {
          ...node.properties,
          inputs: node.inputs,
          outputs: node.outputs,
          label: node.label || getNodeLabel(node.type),
          type: node.type
        }
      }));

      const flowEdges = shader.graph.connections.map((conn: any) => ({
        id: `${conn.from.nodeId}-${conn.to.nodeId}`,
        source: conn.from.nodeId,
        sourceHandle: conn.from.outputId,
        target: conn.to.nodeId,
        targetHandle: conn.to.inputId
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  };

  const loadExampleShader = (exampleId: string) => {
    const exampleShader = getExampleShader(exampleId);
    if (!exampleShader) return;

    // Register the example shader in the shader manager
    const registeredShader = shaderManager.registerShader({
      ...exampleShader,
      id: undefined // Let it generate a new ID
    });

    // Load it into the editor
    loadShader(registeredShader.id);
    setSelectedShaderId(registeredShader.id); // Update store with selected shader
    toast.success(`Loaded example: ${exampleShader.name}`);
  };

  const saveShader = async () => {
    try {
      // Convert ReactFlow nodes/edges back to shader graph
             const graph = {
         nodes: nodes.map(node => ({
           id: node.id,
           type: node.type || 'unknown',
           position: node.position,
           properties: node.data,
           inputs: node.data.inputs || [],
           outputs: node.data.outputs || []
         })),
        connections: edges.map(edge => ({
          from: {
            nodeId: edge.source,
            outputId: edge.sourceHandle || 'output'
          },
          to: {
            nodeId: edge.target,
            inputId: edge.targetHandle || 'input'
          }
        }))
      };

      const config: TSLShaderConfig = {
        id: selectedShader || undefined,
        name: shaderName,
        type: shaderType,
        graph,
        parameters: [],
        metadata: {
          author: 'Editor',
          version: '1.0.0'
        }
      };

      if (selectedShader) {
        shaderManager.updateShaderGraph(selectedShader, graph);
      } else {
        const shader = shaderManager.registerShader(config);
        setSelectedShader(shader.id);
        setSelectedShaderId(shader.id); // Update store with selected shader
      }

      toast.success('Shader saved successfully');
    } catch (error) {
      toast.error('Failed to save shader');
      console.error('Save shader error:', error);
    }
  };

  const compileShader = async () => {
    if (!selectedShader) return;

    try {
      await shaderManager.compileShader(selectedShader);
      
      // Apply shader to entity after successful compilation
      const applied = await ShaderApplicationService.applyCurrentShaderToCurrentEntity();
      
      if (applied) {
        toast.success('Shader compiled and applied successfully');
      } else {
        toast.success('Shader compiled successfully');
        toast.warning('Could not apply shader to entity');
      }
    } catch (error) {
      toast.error('Failed to compile shader');
      console.error('Compile error:', error);
    }
  };

  const handleClose = () => {
    setShaderEditorOpen(false);
    onClose?.();
  };

  return (
    <Dialog open={shaderEditorOpen} onOpenChange={setShaderEditorOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[90vh] p-0">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>Shader Editor</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-full">
          <div className="w-80 border-r bg-muted/30 p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="shader-name">Name</Label>
                <Input
                  id="shader-name"
                  value={shaderName}
                  onChange={(e) => setShaderName(e.target.value)}
                  placeholder="Shader name"
                />
              </div>
              
              <div>
                <Label htmlFor="shader-type">Type</Label>
                <Select value={shaderType} onValueChange={(v) => setShaderType(v as ShaderType)}>
                  <SelectTrigger id="shader-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="postprocess">Post Process</SelectItem>
                    <SelectItem value="compute">Compute</SelectItem>
                    <SelectItem value="particle">Particle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="load-example">Load Example</Label>
                <Select onValueChange={loadExampleShader}>
                  <SelectTrigger id="load-example">
                    <SelectValue placeholder="Select an example..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getExampleShaderIds().map((id) => {
                      const example = getExampleShader(id);
                      return (
                        <SelectItem key={id} value={id}>
                          {example?.name || id}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <ShaderNodeLibrary />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="graph" className="flex-1 flex flex-col">
              <TabsList className="mx-4">
                <TabsTrigger value="graph">Graph</TabsTrigger>
                <TabsTrigger value="parameters">Parameters</TabsTrigger>
                <TabsTrigger value="preview" disabled={!previewEnabled}>Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="graph" className="flex-1 m-0">
                <ReactFlowProvider>
                  <div className="w-full h-full" ref={reactFlowWrapper}>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onInit={setReactFlowInstance}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      nodeTypes={nodeTypes}
                      fitView
                    >
                                             <Background variant={"dots" as any} gap={12} size={1} />
                      <Controls />
                      <MiniMap />
                      <Panel position="top-right" className="space-x-2">
                        <Button size="sm" onClick={saveShader}>
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={compileShader}>
                          Compile
                        </Button>
                      </Panel>
                    </ReactFlow>
                  </div>
                </ReactFlowProvider>
              </TabsContent>
              
              <TabsContent value="parameters" className="flex-1 p-4">
                {selectedShader && <ShaderParameters shaderId={selectedShader} />}
              </TabsContent>
              
              <TabsContent value="preview" className="flex-1 p-4">
                {selectedShader && previewEnabled && <ShaderPreview shaderId={selectedShader} />}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ShaderEditorWrapper() {
  return (
    <ReactFlowProvider>
      <ShaderEditor />
    </ReactFlowProvider>
  );
} 