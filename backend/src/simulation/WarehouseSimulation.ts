import {
  EventLogEntry,
  EventType,
  HumanWorker,
  Position,
  RobotId,
  SimulationEvent,
  SimulationMetrics,
  TaskData,
  TaskHistoryEntry,
  TileType,
  WarehouseState,
  ZoneOccupancy,
  GeminiPromptState,
} from '../types';
import { Robot } from './Robot';
import { Pathfinding } from './Pathfinding';
import { TaskManager } from './TaskManager';
import { EventGenerator } from './EventGenerator';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;

const OBSTACLES: Position[] = [
  // Shelf blocks scattered through center
  { x: 6, y: 3 }, { x: 7, y: 3 },
  { x: 6, y: 5 }, { x: 7, y: 5 },
  { x: 6, y: 7 }, { x: 7, y: 7 },
  { x: 15, y: 3 }, { x: 16, y: 3 },
  { x: 15, y: 5 }, { x: 16, y: 5 },
  { x: 10, y: 2 }, { x: 10, y: 3 },
  { x: 12, y: 2 }, { x: 12, y: 3 },
  { x: 10, y: 11 }, { x: 10, y: 12 },
  { x: 14, y: 8 }, { x: 14, y: 9 },
];

export type SimulationCallback = (
  type: string,
  data: Record<string, unknown>
) => void;

export class WarehouseSimulation {
  private grid: TileType[][] = [];
  private robots: Robot[] = [];
  private pathfinder: Pathfinding;
  private taskManager: TaskManager;
  private eventGenerator: EventGenerator;
  private activeEvents: SimulationEvent[] = [];
  private allEvents: SimulationEvent[] = [];
  private humanWorker: HumanWorker | null = null;
  private logs: EventLogEntry[] = [];
  private simulationSpeed: number = 1;
  private tick: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tickMs: number;
  private taskHistory: TaskHistoryEntry[] = [];
  private lastHistoryRecord: number = 0;
  private onBroadcast: SimulationCallback | null = null;
  private humanMoveTick: number = 0;

  constructor(tickMs: number = 100) {
    this.tickMs = tickMs;
    this.initGrid();
    this.pathfinder = new Pathfinding(this.grid);
    this.taskManager = new TaskManager();
    this.eventGenerator = new EventGenerator(this.grid);
    this.initRobots();
  }

  setCallback(cb: SimulationCallback): void {
    this.onBroadcast = cb;
  }

  private broadcast(type: string, data: Record<string, unknown>): void {
    if (this.onBroadcast) {
      this.onBroadcast(type, data);
    }
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Zones
        if (x >= 0 && x <= 3 && y >= 0 && y <= 3) {
          row.push('ZONE_D'); // Charging
        } else if (x >= 0 && x <= 5 && y >= 10 && y <= 14) {
          row.push('ZONE_A'); // Pickup
        } else if (x >= 8 && x <= 14 && y >= 4 && y <= 10) {
          row.push('ZONE_B'); // Storage
        } else if (x >= 15 && x <= 19 && y >= 10 && y <= 14) {
          row.push('ZONE_C'); // Delivery
        } else {
          row.push('FLOOR');
        }
      }
      this.grid.push(row);
    }

    // Place obstacles
    for (const obs of OBSTACLES) {
      if (obs.y < GRID_HEIGHT && obs.x < GRID_WIDTH) {
        this.grid[obs.y][obs.x] = 'OBSTACLE';
      }
    }
  }

  private initRobots(): void {
    this.robots = [
      new Robot('R1', { x: 2, y: 2 }, '#00d4ff', 100, this.pathfinder),
      new Robot('R2', { x: 5, y: 10 }, '#ff6b35', 87, this.pathfinder),
      new Robot('R3', { x: 12, y: 7 }, '#a855f7', 72, this.pathfinder),
      new Robot('R4', { x: 17, y: 12 }, '#00ff88', 55, this.pathfinder),
    ];
  }

  start(): void {
    if (this.intervalId) return;

    // Start R4 heading to charge immediately (low battery demo)
    const r4 = this.robots.find(r => r.id === 'R4');
    if (r4 && r4.battery < 60) {
      r4.forceRecharge();
      this.addLog('BATTERY_LOW', `R4 auto-returning to charge (battery: ${r4.battery}%)`, '#ffcc00');
    }

    // Give R2 an initial task to show movement
    const r2 = this.robots.find(r => r.id === 'R2');
    if (r2) {
      r2.navigateTo({ x: 10, y: 8 });
      this.addLog('TASK_ASSIGNED', 'R2 dispatched to Zone B for patrol', '#00d4ff');
    }

    this.intervalId = setInterval(() => this.update(), this.tickMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setSpeed(multiplier: number): void {
    this.simulationSpeed = multiplier;
  }

  private update(): void {
    this.tick++;
    const speed = this.simulationSpeed;

    // Update robots
    for (const robot of this.robots) {
      const completed = robot.tick(this.tickMs, speed);
      if (completed) {
        this.taskManager.recordCompletion(completed);
        this.addLog(
          'TASK_COMPLETED',
          `${robot.id} completed ${completed.type} task`,
          '#00ff88'
        );
        this.broadcast('task:completed', {
          taskId: completed.id,
          robotId: robot.id,
          duration: Date.now() - completed.timestamp,
        });
      }

      // Auto-recharge check
      if (robot.needsCharging()) {
        robot.forceRecharge();
        this.addLog('BATTERY_LOW', `${robot.id} battery low (${Math.round(robot.battery)}%) — auto-recharging`, '#ffcc00');
        this.broadcast('alert:safety', {
          message: `${robot.id} battery critically low`,
          zone: this.getZoneForPosition(robot.position),
          severity: 'medium',
        });
      }

      // Broadcast robot update every 5 ticks
      if (this.tick % 5 === 0) {
        this.broadcast('robot:update', robot.toData() as unknown as Record<string, unknown>);
      }
    }

    // Check congestion
    this.checkCongestion();

    // Update human worker
    this.updateHumanWorker();

    // Generate random events
    const newEvents = this.eventGenerator.tick(this.tickMs, speed);
    for (const event of newEvents) {
      this.handleNewEvent(event);
    }

    // Record task history every 10 seconds
    const now = Date.now();
    if (now - this.lastHistoryRecord >= 10000) {
      this.taskHistory.push({
        timestamp: now,
        tasksCompleted: this.taskManager.getCompletedCount(),
      });
      this.lastHistoryRecord = now;
    }

    // Broadcast metrics every 20 ticks
    if (this.tick % 20 === 0) {
      this.broadcast('metrics:update', this.getMetrics() as unknown as Record<string, unknown>);
    }
  }

  handleNewEvent(event: SimulationEvent): void {
    this.activeEvents.push(event);
    this.allEvents.push(event);
    this.addLog(event.type, event.description, this.getEventColor(event.type));
    this.broadcast('event:new', event as unknown as Record<string, unknown>);

    // Handle human entry specially
    if (event.type === 'HUMAN_ENTRY') {
      this.humanWorker = this.eventGenerator.generateHumanWorker();
      // Pause robots near human
      for (const robot of this.robots) {
        if (this.distance(robot.position, event.location) <= 3) {
          robot.pause();
          this.addLog(
            'SAFETY_ALERT',
            `${robot.id} paused — human worker nearby`,
            '#ff6b35'
          );
          this.broadcast('alert:safety', {
            message: `${robot.id} paused for human safety`,
            zone: this.getZoneForPosition(event.location),
            severity: 'high',
          });
        }
      }
    }

    // Create task and assign using rule-based fallback
    // (Gemini is called separately via handleEventWithGemini)
    const task = this.taskManager.createTaskFromEvent(event);
    const assigned = this.taskManager.assignTaskToNearestRobot(task, this.robots);
    if (assigned) {
      this.addLog(
        'TASK_ASSIGNED',
        `${assigned.id} assigned to ${task.type} at (${task.location.x}, ${task.location.y})`,
        '#00d4ff'
      );
      this.broadcast('task:assigned', {
        taskId: task.id,
        robotId: assigned.id,
        taskType: task.type,
        location: task.location,
      });
    }

    // Mark event as resolved after task assignment
    event.resolved = true;
    this.activeEvents = this.activeEvents.filter(e => !e.resolved);
  }

  triggerManualEvent(type: EventType, location?: Position): SimulationEvent {
    const event = this.eventGenerator.generateManualEvent(type, location);
    this.handleNewEvent(event);
    return event;
  }

  sendRobotCommand(robotId: RobotId, command: string, params: Record<string, unknown>): boolean {
    const robot = this.robots.find(r => r.id === robotId);
    if (!robot) return false;

    switch (command) {
      case 'move':
        robot.navigateTo(params.destination as Position);
        return true;
      case 'pause':
        robot.pause();
        return true;
      case 'resume':
        robot.resume();
        return true;
      case 'recharge':
        robot.forceRecharge();
        return true;
      default:
        return false;
    }
  }

  getGeminiPromptState(): GeminiPromptState {
    return {
      robots: this.robots.map(r => ({
        id: r.id,
        position: r.position,
        state: r.state,
        battery: r.battery,
        currentTask: r.currentTask?.type || null,
        queueLength: r.queueLength,
      })),
      activeEvents: this.activeEvents.map(e => ({
        type: e.type,
        location: e.location,
        priority: e.priority,
        timestamp: e.timestamp,
      })),
      zoneOccupancy: this.getZoneOccupancy(),
      humanWorkerPosition: this.humanWorker?.active ? this.humanWorker.position : null,
    };
  }

  applyGeminiAssignments(assignments: { robotId: RobotId; taskType: string; priority: number; targetLocation: Position; reason: string }[]): void {
    this.taskManager.assignFromGemini(
      assignments.map(a => ({
        ...a,
        taskType: a.taskType as import('../types').TaskType,
      })),
      this.robots
    );
  }

  getFullState(): WarehouseState {
    return {
      robots: this.robots.map(r => r.toData()),
      events: this.allEvents.slice(-50),
      activeEvents: this.activeEvents,
      humanWorker: this.humanWorker,
      zoneOccupancy: this.getZoneOccupancy(),
      grid: this.grid,
      obstacles: OBSTACLES,
      metrics: this.getMetrics(),
      simulationSpeed: this.simulationSpeed,
      tick: this.tick,
    };
  }

  getMetrics(): SimulationMetrics {
    return {
      tasksCompleted: this.taskManager.getCompletedCount(),
      totalTasks: this.taskManager.getCompletedCount() + this.activeEvents.length,
      avgResponseTime: this.taskManager.getAvgResponseTime(),
      efficiency: this.taskManager.getEfficiency(this.robots),
      taskHistory: this.taskHistory,
      robotUtilization: this.taskManager.getRobotUtilization(this.robots),
      taskTypeDistribution: this.taskManager.getTaskTypeDistribution(),
    };
  }

  getLogs(limit: number = 100): EventLogEntry[] {
    return this.logs.slice(-limit);
  }

  private checkCongestion(): void {
    for (let i = 0; i < this.robots.length; i++) {
      for (let j = i + 1; j < this.robots.length; j++) {
        const dist = this.distance(this.robots[i].position, this.robots[j].position);
        if (dist <= 2 && this.robots[i].state === 'MOVING' && this.robots[j].state === 'MOVING') {
          // Congestion detected — reroute second robot
          const target = this.robots[j].data.targetPosition;
          if (target) {
            const blocked = [this.robots[i].position];
            this.robots[j].navigateTo(target, blocked);
          }
        }
      }
    }
  }

  private updateHumanWorker(): void {
    if (!this.humanWorker || !this.humanWorker.active) return;

    this.humanMoveTick++;
    if (this.humanMoveTick % (10 / this.simulationSpeed) < 1) {
      this.humanWorker.pathIndex++;
      if (this.humanWorker.pathIndex >= this.humanWorker.path.length) {
        this.humanWorker.active = false;
        this.humanWorker = null;
        // Resume paused robots
        for (const robot of this.robots) {
          if (robot.state === 'PAUSED') {
            robot.resume();
            this.addLog('SAFETY_ALERT', `${robot.id} resumed — human worker left zone`, '#00ff88');
          }
        }
        return;
      }
      this.humanWorker.position = { ...this.humanWorker.path[this.humanWorker.pathIndex] };
    }
  }

  private getZoneOccupancy(): ZoneOccupancy {
    const occ: ZoneOccupancy = { ZONE_A: 0, ZONE_B: 0, ZONE_C: 0, ZONE_D: 0 };
    for (const robot of this.robots) {
      const zone = this.getZoneForPosition(robot.position);
      if (zone in occ) {
        occ[zone as keyof ZoneOccupancy]++;
      }
    }
    return occ;
  }

  private getZoneForPosition(pos: Position): string {
    if (pos.x >= 0 && pos.x <= 3 && pos.y >= 0 && pos.y <= 3) return 'ZONE_D';
    if (pos.x >= 0 && pos.x <= 5 && pos.y >= 10 && pos.y <= 14) return 'ZONE_A';
    if (pos.x >= 8 && pos.x <= 14 && pos.y >= 4 && pos.y <= 10) return 'ZONE_B';
    if (pos.x >= 15 && pos.x <= 19 && pos.y >= 10 && pos.y <= 14) return 'ZONE_C';
    return 'NONE';
  }

  private addLog(type: string, message: string, color: string): void {
    const entry: EventLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as EventLogEntry['type'],
      message,
      timestamp: Date.now(),
      color,
    };
    this.logs.push(entry);
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(-100);
    }
  }

  private getEventColor(type: EventType): string {
    const colors: Record<EventType, string> = {
      PACKAGE_DROP: '#00d4ff',
      SPILL: '#ff6b35',
      HUMAN_ENTRY: '#ffcc00',
      CONGESTION: '#a855f7',
      BATTERY_LOW: '#ffcc00',
    };
    return colors[type];
  }

  private distance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
