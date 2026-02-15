import { Handle, Position, NodeProps } from 'reactflow';

interface TriggerNodeData {
  label: string;
  eventType: string;
}

export default function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[160px] transition-all duration-150"
      style={{
        background: selected ? 'rgba(0, 255, 136, 0.25)' : 'rgba(0, 255, 136, 0.1)',
        borderColor: selected ? '#4fffaa' : '#00ff88',
        boxShadow: selected
          ? '0 0 20px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.15)'
          : '0 0 10px rgba(0, 255, 136, 0.2)',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <div className="text-[8px] text-green-400 uppercase tracking-wider mb-0.5">
        Trigger
      </div>
      <div className="text-[11px] text-white font-semibold">{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-400 !border-green-600 !w-3 !h-3"
      />
    </div>
  );
}
