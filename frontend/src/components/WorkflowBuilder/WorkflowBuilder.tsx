/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TriggerNode from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import AIDecisionNode from './nodes/AIDecisionNode';
import { defaultNodes, defaultEdges } from './defaultWorkflows';

// React 19 has stricter JSX type requirements that conflict with ReactFlow's older types.
// Import these separately and use them as any to avoid type errors at the JSX boundary.
import { Background, Controls, MiniMap, Panel } from 'reactflow';
const RFBackground = Background as any;
const RFControls = Controls as any;
const RFMiniMap = MiniMap as any;
const RFPanel = Panel as any;

export default function WorkflowBuilder() {
  const [nodes, , onNodesChange] = useNodesState(defaultNodes);
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

  return (
    <div className="h-full w-full rounded-lg border border-rl-border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
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
        <RFPanel position="top-left">
          <div className="panel p-3">
            <h3 className="font-heading font-semibold text-sm text-white mb-2">
              Workflow Builder
            </h3>
            <p className="text-[9px] text-gray-500 mb-3">
              Drag nodes to rearrange. Connect outputs to inputs.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-green-400 bg-green-400/20" />
                <span className="text-[9px] text-gray-400">Trigger Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-yellow-400 bg-yellow-400/20" />
                <span className="text-[9px] text-gray-400">Condition Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-cyan-400 bg-cyan-400/20" />
                <span className="text-[9px] text-gray-400">Action Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-purple-400 bg-purple-400/20" />
                <span className="text-[9px] text-gray-400">AI Decision Nodes</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-rl-border">
              <div className="text-[8px] text-gray-600 uppercase tracking-wider mb-1">
                Active Workflows
              </div>
              <div className="space-y-0.5 text-[9px]">
                <div className="text-green-400">&#10003; Package Handling</div>
                <div className="text-green-400">&#10003; Human Safety</div>
                <div className="text-green-400">&#10003; Battery Management</div>
                <div className="text-purple-400">&#10003; AI Spill Response</div>
              </div>
            </div>
          </div>
        </RFPanel>
      </ReactFlow>
    </div>
  );
}
