import { Handle, Position, NodeProps } from 'reactflow';

interface AIDecisionNodeData {
  label: string;
}

export default function AIDecisionNode({ data, selected }: NodeProps<AIDecisionNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[160px] transition-all duration-150"
      style={{
        background: selected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.1)',
        borderColor: selected ? '#c084fc' : '#a855f7',
        boxShadow: selected
          ? '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.15)'
          : '0 0 10px rgba(168, 85, 247, 0.2)',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
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
