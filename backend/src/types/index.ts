// ========== Core Types ==========

export interface Position {
  x: number;
  y: number;
}

export type RobotId = 'R1' | 'R2' | 'R3' | 'R4';

export type RobotState = 'IDLE' | 'MOVING' | 'WORKING' | 'PAUSED' | 'CHARGING';

export type TaskType = 'PICKUP' | 'CLEAN' | 'ESCORT' | 'RECHARGE' | 'STANDBY';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type EventType = 'PACKAGE_DROP' | 'SPILL' | 'HUMAN_ENTRY' | 'CONGESTION' | 'BATTERY_LOW';

export type ZoneName = 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'ZONE_D';

export type TileType = 'FLOOR' | 'OBSTACLE' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'ZONE_D';

// ========== Robot ==========

export interface RobotData {
  id: RobotId;
  position: Position;
  targetPosition: Position | null;
  state: RobotState;
  battery: number;
  currentTask: TaskData | null;
  taskQueue: TaskData[];
  path: Position[];
  color: string;
}

// ========== Task ==========

export interface TaskData {
  id: string;
  type: TaskType;
  priority: number;
  location: Position;
  assignedRobot: RobotId | null;
  status: TaskStatus;
  timestamp: number;
  description: string;
  dwellTime?: number;
  dwellRemaining?: number;
}

// ========== Events ==========

export interface SimulationEvent {
  id: string;
  type: EventType;
  location: Position;
  priority: number;
  timestamp: number;
  description: string;
  resolved: boolean;
}

// ========== Warehouse State ==========

export interface ZoneOccupancy {
  ZONE_A: number;
  ZONE_B: number;
  ZONE_C: number;
  ZONE_D: number;
}

export interface WarehouseState {
  robots: RobotData[];
  events: SimulationEvent[];
  activeEvents: SimulationEvent[];
  humanWorker: HumanWorker | null;
  zoneOccupancy: ZoneOccupancy;
  grid: TileType[][];
  obstacles: Position[];
  metrics: SimulationMetrics;
  simulationSpeed: number;
  tick: number;
}

export interface HumanWorker {
  position: Position;
  path: Position[];
  pathIndex: number;
  active: boolean;
}

// ========== Metrics ==========

export interface SimulationMetrics {
  tasksCompleted: number;
  totalTasks: number;
  avgResponseTime: number;
  efficiency: number;
  taskHistory: TaskHistoryEntry[];
  robotUtilization: Record<RobotId, number>;
  taskTypeDistribution: Record<TaskType, number>;
}

export interface TaskHistoryEntry {
  timestamp: number;
  tasksCompleted: number;
}

// ========== Gemini ==========

export interface GeminiPromptState {
  robots: {
    id: RobotId;
    position: Position;
    state: RobotState;
    battery: number;
    currentTask: string | null;
    queueLength: number;
  }[];
  activeEvents: {
    type: EventType;
    location: Position;
    priority: number;
    timestamp: number;
  }[];
  zoneOccupancy: ZoneOccupancy;
  humanWorkerPosition: Position | null;
}

export interface GeminiAssignment {
  robotId: RobotId;
  taskType: TaskType;
  priority: number;
  targetLocation: Position;
  reason: string;
}

export interface GeminiResponse {
  reasoning: string;
  assignments: GeminiAssignment[];
  alerts: string[];
  latency?: number;
  fallback?: boolean;
}

// ========== WebSocket Messages ==========

export type ServerWSMessage =
  | { type: 'robot:update'; data: RobotData }
  | { type: 'event:new'; data: SimulationEvent }
  | { type: 'gemini:response'; data: GeminiResponse }
  | { type: 'workflow:execute'; data: { nodeId: string; status: string } }
  | { type: 'workflow:updated'; data: { nodeCount: number; edgeCount: number } }
  | { type: 'workflow:action'; data: { message: string } }
  | { type: 'metrics:update'; data: SimulationMetrics }
  | { type: 'task:assigned'; data: { taskId: string; robotId: RobotId; taskType: TaskType; location: Position } }
  | { type: 'task:completed'; data: { taskId: string; robotId: RobotId; duration: number } }
  | { type: 'alert:safety'; data: { message: string; zone: ZoneName; severity: 'low' | 'medium' | 'high' } }
  | { type: 'gemini:skipped'; data: { eventType: string } }
  | { type: 'events:cleared'; data: Record<string, never> }
  | { type: 'state:full'; data: WarehouseState };

export type ClientWSMessage =
  | { type: 'robot:manual'; data: { robotId: RobotId; destination: Position } }
  | { type: 'event:trigger'; data: { type: EventType; location?: Position } }
  | { type: 'event:clear'; data: Record<string, never> }
  | { type: 'workflow:sync'; data: { nodes: { id: string; type: string; data: Record<string, string> }[]; edges: { id: string; source: string; target: string; sourceHandle?: string }[] } }
  | { type: 'workflow:activate'; data: { workflowId: string; active: boolean } }
  | { type: 'simulation:speed'; data: { multiplier: number } };

// ========== API Types ==========

export interface HealthResponse {
  status: string;
  uptime: number;
  vultr: boolean;
  message: string;
  timestamp: number;
}

export interface EventLogEntry {
  id: string;
  type: EventType | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'GEMINI_DECISION' | 'SAFETY_ALERT';
  message: string;
  timestamp: number;
  color: string;
}
