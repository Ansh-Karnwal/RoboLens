import { Node, Edge } from 'reactflow';

export const defaultNodes: Node[] = [
  // Workflow 1: Package handling (AI-powered)
  {
    id: 'pkg-trigger',
    type: 'triggerNode',
    position: { x: 50, y: 50 },
    data: { label: 'Package Detected', eventType: 'PACKAGE_DROP' },
  },
  {
    id: 'pkg-ai',
    type: 'aiDecisionNode',
    position: { x: 300, y: 50 },
    data: { label: 'Ask Gemini' },
  },
  {
    id: 'pkg-action',
    type: 'actionNode',
    position: { x: 570, y: 50 },
    data: { label: 'Execute AI Plan', action: 'execute_ai' },
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
  // Package workflow (AI-powered)
  {
    id: 'e-pkg-1',
    source: 'pkg-trigger',
    target: 'pkg-ai',
    animated: true,
    style: { stroke: '#a855f7' },
  },
  {
    id: 'e-pkg-2',
    source: 'pkg-ai',
    target: 'pkg-action',
    animated: true,
    style: { stroke: '#a855f7' },
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
