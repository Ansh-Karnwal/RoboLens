import { Handle, Position, NodeProps } from 'reactflow';

interface ConditionNodeData {
  label: string;
  condition: string;
}

export default function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  return (
    <div
      className="px-4 py-2 rounded-lg border-2 min-w-[160px] transition-all duration-150"
      style={{
        background: selected ? 'rgba(255, 204, 0, 0.25)' : 'rgba(255, 204, 0, 0.1)',
        borderColor: selected ? '#ffd84d' : '#ffcc00',
        boxShadow: selected
          ? '0 0 20px rgba(255, 204, 0, 0.5), 0 0 40px rgba(255, 204, 0, 0.15)'
          : '0 0 10px rgba(255, 204, 0, 0.2)',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-yellow-400 !border-yellow-600 !w-3 !h-3"
      />
      <div className="text-[8px] text-yellow-400 uppercase tracking-wider mb-0.5">
        Condition
      </div>
      <div className="text-[11px] text-white font-semibold">{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!bg-green-400 !border-green-600 !w-3 !h-3"
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        className="!bg-red-400 !border-red-600 !w-3 !h-3"
        style={{ top: '70%' }}
      />
      <div
        className="absolute text-[7px] text-green-400"
        style={{ right: -24, top: '22%' }}
      >
        YES
      </div>
      <div
        className="absolute text-[7px] text-red-400"
        style={{ right: -20, top: '62%' }}
      >
        NO
      </div>
    </div>
  );
}
