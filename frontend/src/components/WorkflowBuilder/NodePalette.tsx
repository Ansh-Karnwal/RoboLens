import { DragEvent } from 'react';

interface PresetNode {
  type: string;
  label: string;
  data: Record<string, string>;
  color: string;
  category: string;
}

const PRESET_NODES: PresetNode[] = [
  // Triggers
  { type: 'triggerNode', label: 'Package Detected', data: { label: 'Package Detected', eventType: 'PACKAGE_DROP' }, color: '#00ff88', category: 'Triggers' },
  { type: 'triggerNode', label: 'Spill Detected', data: { label: 'Spill Detected', eventType: 'SPILL' }, color: '#00ff88', category: 'Triggers' },
  { type: 'triggerNode', label: 'Human Entered Zone', data: { label: 'Human Entered Zone', eventType: 'HUMAN_ENTRY' }, color: '#00ff88', category: 'Triggers' },
  { type: 'triggerNode', label: 'Congestion Alert', data: { label: 'Congestion Alert', eventType: 'CONGESTION' }, color: '#00ff88', category: 'Triggers' },
  { type: 'triggerNode', label: 'Battery Low', data: { label: 'Battery Low', eventType: 'BATTERY_LOW' }, color: '#00ff88', category: 'Triggers' },

  // Actions
  { type: 'actionNode', label: 'Send Nearest Robot', data: { label: 'Send Nearest Robot', action: 'dispatch_nearest' }, color: '#00d4ff', category: 'Actions' },
  { type: 'actionNode', label: 'Send All to Charging', data: { label: 'Send All to Charging', action: 'recharge_all' }, color: '#00d4ff', category: 'Actions' },
  { type: 'actionNode', label: 'Pause All Robots', data: { label: 'Pause All Robots', action: 'pause_all' }, color: '#00d4ff', category: 'Actions' },
  { type: 'actionNode', label: 'Resume All Robots', data: { label: 'Resume All Robots', action: 'resume_all' }, color: '#00d4ff', category: 'Actions' },
  { type: 'actionNode', label: 'Dispatch to Charging', data: { label: 'Dispatch to Charging', action: 'recharge' }, color: '#00d4ff', category: 'Actions' },
  { type: 'actionNode', label: 'Queue Task', data: { label: 'Queue Task', action: 'queue_task' }, color: '#00d4ff', category: 'Actions' },
  { type: 'actionNode', label: 'Log Alert', data: { label: 'Log Alert', action: 'log_alert' }, color: '#00d4ff', category: 'Actions' },

  // Conditions
  { type: 'conditionNode', label: 'Battery > 20%?', data: { label: 'Battery > 20%?', condition: 'battery_above_20' }, color: '#ffcc00', category: 'Conditions' },
  { type: 'conditionNode', label: 'Has Idle Robot?', data: { label: 'Has Idle Robot?', condition: 'has_idle_robot' }, color: '#ffcc00', category: 'Conditions' },
  { type: 'conditionNode', label: 'Priority > 3?', data: { label: 'Priority > 3?', condition: 'priority_gt_3' }, color: '#ffcc00', category: 'Conditions' },

  // AI
  { type: 'aiDecisionNode', label: 'Ask Gemini AI', data: { label: 'Ask Gemini AI' }, color: '#a855f7', category: 'AI' },
];

function onDragStart(event: DragEvent, nodeType: string, data: Record<string, string>) {
  event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, data }));
  event.dataTransfer.effectAllowed = 'move';
}

export default function NodePalette() {
  const categories = ['Triggers', 'Actions', 'Conditions', 'AI'];

  return (
    <div className="w-[200px] flex-shrink-0 panel p-3 overflow-y-auto flex flex-col gap-3">
      <div>
        <h3 className="font-heading font-semibold text-xs text-white mb-1">
          Node Palette
        </h3>
        <p className="text-[8px] text-gray-500">
          Drag nodes onto the canvas
        </p>
      </div>

      {categories.map((cat) => {
        const catNodes = PRESET_NODES.filter((n) => n.category === cat);
        return (
          <div key={cat}>
            <div className="text-[8px] text-gray-600 uppercase tracking-wider mb-1.5">
              {cat}
            </div>
            <div className="space-y-1">
              {catNodes.map((preset) => (
                <div
                  key={`${preset.type}-${preset.label}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, preset.type, preset.data)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border cursor-grab
                             active:cursor-grabbing transition-smooth hover:border-opacity-60"
                  style={{
                    borderColor: `${preset.color}33`,
                    background: `${preset.color}08`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${preset.color}80`;
                    (e.currentTarget as HTMLDivElement).style.background = `${preset.color}15`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${preset.color}33`;
                    (e.currentTarget as HTMLDivElement).style.background = `${preset.color}08`;
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="text-[9px] text-gray-300 truncate">
                    {preset.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-auto pt-2 border-t border-rl-border">
        <div className="text-[8px] text-gray-600 uppercase tracking-wider mb-1">
          Tips
        </div>
        <ul className="text-[8px] text-gray-500 space-y-0.5">
          <li>Connect trigger output to action input</li>
          <li>Select node + press Delete to remove</li>
          <li>Drag edges between handles</li>
        </ul>
      </div>
    </div>
  );
}
