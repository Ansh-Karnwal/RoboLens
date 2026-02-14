import { Handle, Position, NodeProps } from 'reactflow';

interface AIDecisionNodeData {
  label: string;
}

export default function AIDecisionNode({ data }: NodeProps<AIDecisionNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[160px]"
      style={{
        background: 'rgba(168, 85, 247, 0.1)',
        borderColor: '#a855f7',
        boxShadow: '0 0 10px rgba(168, 85, 247, 0.2)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-400 !border-purple-600 !w-3 !h-3"
      />
      <div className="text-[8px] text-purple-400 uppercase tracking-wider mb-0.5">
        AI Decision
      </div>
      <div className="text-[11px] text-white font-semibold">{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-400 !border-purple-600 !w-3 !h-3"
      />
    </div>
  );
}
