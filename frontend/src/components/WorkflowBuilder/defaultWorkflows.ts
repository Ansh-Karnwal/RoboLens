import { Node, Edge } from 'reactflow';

export const defaultNodes: Node[] = [
  // Workflow 1: Package handling
  {
    id: 'pkg-trigger',
    type: 'triggerNode',
    position: { x: 50, y: 50 },
    data: { label: 'Package Detected', eventType: 'PACKAGE_DROP' },
  },
  {
    id: 'pkg-priority',
    type: 'conditionNode',
    position: { x: 300, y: 40 },
    data: { label: 'Priority > 3?', condition: 'priority > 3' },
  },
  {
    id: 'pkg-dispatch-high',
    type: 'actionNode',
    position: { x: 570, y: 10 },
    data: { label: 'Dispatch Nearest Robot', action: 'dispatch_nearest' },
  },
  {
    id: 'pkg-idle-check',
    type: 'conditionNode',
    position: { x: 570, y: 100 },
    data: { label: 'Zone Has Idle Robot?', condition: 'zone_has_idle' },
  },
  {
    id: 'pkg-dispatch-idle',
    type: 'actionNode',
    position: { x: 820, y: 70 },
    data: { label: 'Dispatch Nearest Robot', action: 'dispatch_nearest' },
  },
  {
    id: 'pkg-queue',
    type: 'actionNode',
    position: { x: 820, y: 150 },
    data: { label: 'Queue Task', action: 'queue_task' },
  },

  // Workflow 2: Human safety
  {
    id: 'human-trigger',
    type: 'triggerNode',
    position: { x: 50, y: 250 },
    data: { label: 'Human Entered Zone', eventType: 'HUMAN_ENTRY' },
  },
  {
    id: 'human-pause',
    type: 'actionNode',
    position: { x: 300, y: 250 },
    data: { label: 'Pause All Robots In Zone', action: 'pause_zone' },
  },

  // Workflow 3: Battery management
  {
    id: 'battery-trigger',
    type: 'triggerNode',
    position: { x: 50, y: 370 },
    data: { label: 'Robot Battery < 15%', eventType: 'BATTERY_LOW' },
  },
  {
    id: 'battery-charge',
    type: 'actionNode',
    position: { x: 300, y: 370 },
    data: { label: 'Dispatch to Charging Zone', action: 'recharge' },
  },

  // Workflow 4: AI-powered decision
  {
    id: 'spill-trigger',
    type: 'triggerNode',
    position: { x: 50, y: 480 },
    data: { label: 'Spill Detected', eventType: 'SPILL' },
  },
  {
    id: 'spill-ai',
    type: 'aiDecisionNode',
    position: { x: 300, y: 480 },
    data: { label: 'Ask Gemini' },
  },
  {
    id: 'spill-action',
    type: 'actionNode',
    position: { x: 570, y: 480 },
    data: { label: 'Execute AI Plan', action: 'execute_ai' },
  },
];

export const defaultEdges: Edge[] = [
  // Package workflow
  {
    id: 'e-pkg-1',
    source: 'pkg-trigger',
    target: 'pkg-priority',
    animated: true,
    style: { stroke: '#00ff88' },
  },
  {
    id: 'e-pkg-2',
    source: 'pkg-priority',
    sourceHandle: 'yes',
    target: 'pkg-dispatch-high',
    animated: true,
    style: { stroke: '#00ff88' },
    label: 'YES',
    labelStyle: { fill: '#00ff88', fontSize: 9 },
    labelBgStyle: { fill: '#0a0e1a' },
  },
  {
    id: 'e-pkg-3',
    source: 'pkg-priority',
    sourceHandle: 'no',
    target: 'pkg-idle-check',
    animated: true,
    style: { stroke: '#ff4444' },
    label: 'NO',
    labelStyle: { fill: '#ff4444', fontSize: 9 },
    labelBgStyle: { fill: '#0a0e1a' },
  },
  {
    id: 'e-pkg-4',
    source: 'pkg-idle-check',
    sourceHandle: 'yes',
    target: 'pkg-dispatch-idle',
    animated: true,
    style: { stroke: '#00ff88' },
  },
  {
    id: 'e-pkg-5',
    source: 'pkg-idle-check',
    sourceHandle: 'no',
    target: 'pkg-queue',
    animated: true,
    style: { stroke: '#ff4444' },
  },

  // Human safety workflow
  {
    id: 'e-human-1',
    source: 'human-trigger',
    target: 'human-pause',
    animated: true,
    style: { stroke: '#ffcc00' },
  },

  // Battery workflow
  {
    id: 'e-battery-1',
    source: 'battery-trigger',
    target: 'battery-charge',
    animated: true,
    style: { stroke: '#ffcc00' },
  },

  // Spill + AI workflow
  {
    id: 'e-spill-1',
    source: 'spill-trigger',
    target: 'spill-ai',
    animated: true,
    style: { stroke: '#a855f7' },
  },
  {
    id: 'e-spill-2',
    source: 'spill-ai',
    target: 'spill-action',
    animated: true,
    style: { stroke: '#a855f7' },
  },
];
