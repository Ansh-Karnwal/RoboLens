/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef, useState, useEffect, DragEvent } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  BackgroundVariant,
  Node,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TriggerNode from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import AIDecisionNode from './nodes/AIDecisionNode';
import { defaultNodes, defaultEdges } from './defaultWorkflows';
import NodePalette from './NodePalette';

import { Background, Controls, MiniMap, Panel } from 'reactflow';
const RFBackground = Background as any;
const RFControls = Controls as any;
const RFMiniMap = MiniMap as any;
const RFPanel = Panel as any;

let nodeIdCounter = 100;
function getNextNodeId() {
  return `node-${nodeIdCounter++}`;
}

interface WorkflowBuilderProps {
  onWorkflowChange?: (nodes: Node[], edges: any[]) => void;
}

export default function WorkflowBuilder({ onWorkflowChange }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const nodeTypes = useMemo(
    () => ({
      triggerNode: TriggerNode as any,
      conditionNode: ConditionNode as any,
      actionNode: ActionNode as any,
      aiDecisionNode: AIDecisionNode as any,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#00d4ff' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Sync workflow to parent when nodes/edges change
  useEffect(() => {
    if (onWorkflowChange) {
      onWorkflowChange(nodes, edges);
    }
  }, [nodes, edges, onWorkflowChange]);

  // Drag-and-drop from palette
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const dataStr = event.dataTransfer.getData('application/reactflow');
      if (!dataStr || !rfInstance || !reactFlowWrapper.current) return;

      const { type, data } = JSON.parse(dataStr);

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: getNextNodeId(),
        type,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  // Delete selected nodes/edges with Delete or Backspace
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
      }
    },
    [setNodes, setEdges]
  );

  return (
    <div className="h-full w-full flex gap-2">
      {/* Node Palette */}
      <NodePalette />

      {/* Canvas */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 rounded-lg border border-rl-border overflow-hidden"
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          deleteKeyCode={['Delete', 'Backspace']}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-rl-bg"
        >
          <RFBackground color="#1a2035" gap={20} variant={BackgroundVariant.Dots} />
          <RFControls />
          <RFMiniMap
            nodeColor={(node: any) => {
              switch (node.type) {
                case 'triggerNode': return '#00ff88';
                case 'conditionNode': return '#ffcc00';
                case 'actionNode': return '#00d4ff';
                case 'aiDecisionNode': return '#a855f7';
                default: return '#666';
              }
            }}
            maskColor="rgba(10, 14, 26, 0.8)"
          />
          <RFPanel position="top-right">
            <div className="panel p-2 text-[9px] text-gray-500">
              Drag nodes from palette. Connect outputs to inputs. Select + Delete to remove.
            </div>
          </RFPanel>
        </ReactFlow>
      </div>
    </div>
  );
}
