import { create } from 'zustand';
import {
  RobotData,
  SimulationEvent,
  GeminiResponse,
  SimulationMetrics,
  EventLogEntry,
  HumanWorker,
  TileType,
  Position,
  ZoneOccupancy,
  TabView,
} from '../types';

interface SimulationStore {
  // Connection
  connected: boolean;
  wsLatency: number;
  setConnected: (connected: boolean) => void;
  setWsLatency: (latency: number) => void;

  // Navigation
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;

  // Simulation
  robots: RobotData[];
  activeEvents: SimulationEvent[];
  humanWorker: HumanWorker | null;
  grid: TileType[][];
  obstacles: Position[];
  simulationSpeed: number;
  tick: number;

  // Metrics
  metrics: SimulationMetrics;

  // Gemini
  geminiResponses: GeminiResponse[];
  geminiThinking: boolean;
  setGeminiThinking: (thinking: boolean) => void;

  // Logs
  logs: EventLogEntry[];

  // Workflow
  activeWorkflows: number;

  // Actions
  updateRobot: (robot: RobotData) => void;
  addEvent: (event: SimulationEvent) => void;
  addGeminiResponse: (response: GeminiResponse) => void;
  updateMetrics: (metrics: SimulationMetrics) => void;
  addLog: (log: EventLogEntry) => void;
  setSimulationSpeed: (speed: number) => void;
  setFullState: (state: {
    robots: RobotData[];
    activeEvents: SimulationEvent[];
    humanWorker: HumanWorker | null;
    grid: TileType[][];
    obstacles: Position[];
    metrics: SimulationMetrics;
    simulationSpeed: number;
    tick: number;
  }) => void;
  setHumanWorker: (hw: HumanWorker | null) => void;
  clearEvents: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  // Connection
  connected: false,
  wsLatency: 0,
  setConnected: (connected) => set({ connected }),
  setWsLatency: (wsLatency) => set({ wsLatency }),

  // Navigation
  activeTab: 'dashboard',
  setActiveTab: (activeTab) => set({ activeTab }),

  // Simulation
  robots: [],
  activeEvents: [],
  humanWorker: null,
  grid: [],
  obstacles: [],
  simulationSpeed: 1,
  tick: 0,

  // Metrics
  metrics: {
    tasksCompleted: 0,
    totalTasks: 0,
    avgResponseTime: 0,
    efficiency: 0,
    taskHistory: [],
    robotUtilization: { R1: 0, R2: 0, R3: 0, R4: 0 },
    taskTypeDistribution: { PICKUP: 0, CLEAN: 0, ESCORT: 0, RECHARGE: 0, STANDBY: 0 },
  },

  // Gemini
  geminiResponses: [],
  geminiThinking: false,
  setGeminiThinking: (geminiThinking) => set({ geminiThinking }),

  // Logs
  logs: [],

  // Workflow
  activeWorkflows: 3,

  // Actions
  updateRobot: (robot) =>
    set((state) => ({
      robots: state.robots.map((r) => (r.id === robot.id ? robot : r)),
    })),

  addEvent: (event) =>
    set((state) => {
      const log: EventLogEntry = {
        id: event.id,
        type: event.type,
        message: event.description,
        timestamp: event.timestamp,
        color: getEventColor(event.type),
      };
      return {
        activeEvents: [...state.activeEvents.slice(-20), event],
        logs: [...state.logs.slice(-99), log],
      };
    }),

  addGeminiResponse: (response) =>
    set((state) => ({
      geminiResponses: [...state.geminiResponses.slice(-9), response],
      geminiThinking: false,
    })),

  updateMetrics: (metrics) => set({ metrics }),

  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs.slice(-99), log],
    })),

  setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),

  setFullState: (fullState) =>
    set({
      robots: fullState.robots,
      activeEvents: fullState.activeEvents,
      humanWorker: fullState.humanWorker,
      grid: fullState.grid,
      obstacles: fullState.obstacles,
      metrics: fullState.metrics,
      simulationSpeed: fullState.simulationSpeed,
      tick: fullState.tick,
    }),

  setHumanWorker: (humanWorker) => set({ humanWorker }),

  clearEvents: () => set({ activeEvents: [], humanWorker: null }),
}));

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    PACKAGE_DROP: '#00d4ff',
    SPILL: '#ff6b35',
    HUMAN_ENTRY: '#ffcc00',
    CONGESTION: '#a855f7',
    BATTERY_LOW: '#ffcc00',
    TASK_ASSIGNED: '#00d4ff',
    TASK_COMPLETED: '#00ff88',
    GEMINI_DECISION: '#a855f7',
    SAFETY_ALERT: '#ff6b35',
  };
  return colors[type] || '#ffffff';
}
