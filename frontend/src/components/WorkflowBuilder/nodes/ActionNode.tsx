import { Handle, Position, NodeProps } from 'reactflow';

interface ActionNodeData {
  label: string;
  action: string;
}

export default function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[160px] transition-all duration-150"
      style={{
        background: selected ? 'rgba(0, 212, 255, 0.25)' : 'rgba(0, 212, 255, 0.1)',
        borderColor: selected ? '#4de4ff' : '#00d4ff',
        boxShadow: selected
          ? '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.15)'
          : '0 0 10px rgba(0, 212, 255, 0.2)',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-400 !border-cyan-600 !w-3 !h-3"
      />
      <div className="text-[8px] text-cyan-400 uppercase tracking-wider mb-0.5">
        Action
      </div>
      <div className="text-[11px] text-white font-semibold">{data.label}</div>
    </div>
  );
}
