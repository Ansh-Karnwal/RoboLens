import { v4 as uuid } from 'uuid';
import { Position, RobotData, RobotId, RobotState, TaskData, TaskType } from '../types';
import { Pathfinding } from './Pathfinding';

const BATTERY_DRAIN_PER_TILE = 1;
const CHARGE_RATE_PER_SECOND = 5;
const LOW_BATTERY_THRESHOLD = 15;
const CHARGE_ZONE: Position = { x: 1, y: 1 };

export class Robot {
  public data: RobotData;
  private pathfinder: Pathfinding;
  private moveProgress: number = 0;
  private ticksSinceLastCharge: number = 0;
  private workingTicks: number = 0;
  private taskStartTime: number = 0;

  constructor(
    id: RobotId,
    position: Position,
    color: string,
    battery: number,
    pathfinder: Pathfinding
  ) {
    this.data = {
      id,
      position: { ...position },
      targetPosition: null,
      state: 'IDLE',
      battery,
      currentTask: null,
      taskQueue: [],
      path: [],
      color,
    };
    this.pathfinder = pathfinder;
  }

  get id(): RobotId {
    return this.data.id;
  }

  get position(): Position {
    return this.data.position;
  }

  get state(): RobotState {
    return this.data.state;
  }

  get battery(): number {
    return this.data.battery;
  }

  get currentTask(): TaskData | null {
    return this.data.currentTask;
  }

  get queueLength(): number {
    return this.data.taskQueue.length;
  }

  needsCharging(): boolean {
    return this.data.battery < LOW_BATTERY_THRESHOLD && this.data.state !== 'CHARGING';
  }

  isAvailable(): boolean {
    return (
      (this.data.state === 'IDLE' || this.data.state === 'CHARGING') &&
      this.data.battery >= LOW_BATTERY_THRESHOLD &&
      this.data.taskQueue.length < 3
    );
  }

  assignTask(task: TaskData): void {
    task.assignedRobot = this.data.id;
    task.status = 'PENDING';

    if (!this.data.currentTask && (this.data.state === 'IDLE' || this.data.state === 'CHARGING')) {
      this.startTask(task);
    } else {
      this.data.taskQueue.push(task);
      this.data.taskQueue.sort((a, b) => b.priority - a.priority);
    }
  }

  private startTask(task: TaskData): void {
    this.data.currentTask = task;
    task.status = 'IN_PROGRESS';
    this.taskStartTime = Date.now();

    if (task.type === 'RECHARGE') {
      this.navigateTo(CHARGE_ZONE);
    } else if (task.type === 'STANDBY') {
      this.data.state = 'IDLE';
      this.data.targetPosition = null;
    } else {
      this.navigateTo(task.location);
    }
  }

  navigateTo(target: Position, blockedPositions: Position[] = []): void {
    this.data.targetPosition = { ...target };
    this.data.path = this.pathfinder.findPath(this.data.position, target, blockedPositions);
    this.data.state = 'MOVING';
    this.moveProgress = 0;
    // Remove the first point if it's our current position
    if (
      this.data.path.length > 0 &&
      this.data.path[0].x === this.data.position.x &&
      this.data.path[0].y === this.data.position.y
    ) {
      this.data.path.shift();
    }
  }

  pause(): void {
    if (this.data.state === 'MOVING' || this.data.state === 'WORKING') {
      this.data.state = 'PAUSED';
    }
  }

  resume(): void {
    if (this.data.state === 'PAUSED') {
      if (this.data.path.length > 0) {
        this.data.state = 'MOVING';
      } else if (this.data.currentTask) {
        this.data.state = 'WORKING';
      } else {
        this.data.state = 'IDLE';
      }
    }
  }

  forceRecharge(): void {
    const rechargeTask: TaskData = {
      id: uuid(),
      type: 'RECHARGE',
      priority: 5,
      location: CHARGE_ZONE,
      assignedRobot: this.data.id,
      status: 'IN_PROGRESS',
      timestamp: Date.now(),
      description: `${this.data.id} auto-returning to charge (battery: ${Math.round(this.data.battery)}%)`,
    };

    // Interrupt current task
    if (this.data.currentTask) {
      this.data.currentTask.status = 'PENDING';
      this.data.taskQueue.unshift(this.data.currentTask);
    }

    this.data.currentTask = rechargeTask;
    this.taskStartTime = Date.now();
    this.navigateTo(CHARGE_ZONE);
  }

  /** Returns completed task data if a task was just completed, otherwise null. */
  tick(tickMs: number, speedMultiplier: number): TaskData | null {
    const effectiveMs = tickMs * speedMultiplier;

    if (this.data.state === 'PAUSED') return null;

    // Charging
    if (this.data.state === 'CHARGING') {
      this.ticksSinceLastCharge += effectiveMs;
      if (this.ticksSinceLastCharge >= 1000) {
        this.data.battery = Math.min(100, this.data.battery + CHARGE_RATE_PER_SECOND);
        this.ticksSinceLastCharge -= 1000;
      }
      if (this.data.battery >= 100) {
        return this.completeCurrentTask();
      }
      return null;
    }

    // Moving
    if (this.data.state === 'MOVING') {
      this.moveProgress += effectiveMs;
      const moveTime = 200; // ms per tile

      while (this.moveProgress >= moveTime && this.data.path.length > 0) {
        this.moveProgress -= moveTime;
        const next = this.data.path.shift()!;
        this.data.position = { ...next };
        this.data.battery = Math.max(0, this.data.battery - BATTERY_DRAIN_PER_TILE);
      }

      // Arrived at destination
      if (this.data.path.length === 0) {
        if (this.data.currentTask) {
          if (this.data.currentTask.type === 'RECHARGE') {
            this.data.state = 'CHARGING';
            this.ticksSinceLastCharge = 0;
          } else {
            this.data.state = 'WORKING';
            this.workingTicks = 0;
            const dwellMs = this.getDwellTime(this.data.currentTask.type);
            this.data.currentTask.dwellTime = dwellMs;
            this.data.currentTask.dwellRemaining = dwellMs;
          }
        } else {
          this.data.state = 'IDLE';
          this.data.targetPosition = null;
        }
      }
      return null;
    }

    // Working (dwell at destination)
    if (this.data.state === 'WORKING' && this.data.currentTask) {
      this.workingTicks += effectiveMs;
      const dwellMs = this.getDwellTime(this.data.currentTask.type);
      this.data.currentTask.dwellRemaining = Math.max(0, dwellMs - this.workingTicks);

      if (this.workingTicks >= dwellMs) {
        return this.completeCurrentTask();
      }
      return null;
    }

    // IDLE — check for queued tasks
    if (this.data.state === 'IDLE' && this.data.taskQueue.length > 0) {
      const next = this.data.taskQueue.shift()!;
      this.startTask(next);
    }

    return null;
  }

  private completeCurrentTask(): TaskData | null {
    if (!this.data.currentTask) return null;

    const completed = { ...this.data.currentTask };
    completed.status = 'COMPLETED';
    this.data.currentTask = null;
    this.data.targetPosition = null;
    this.data.state = 'IDLE';
    this.workingTicks = 0;

    // Pick up next queued task
    if (this.data.taskQueue.length > 0) {
      const next = this.data.taskQueue.shift()!;
      this.startTask(next);
    }

    return completed;
  }

  private getDwellTime(type: TaskType): number {
    switch (type) {
      case 'PICKUP': return 2000;
      case 'CLEAN': return 3000;
      case 'ESCORT': return 5000;
      case 'RECHARGE': return 20000; // handled by battery logic instead
      case 'STANDBY': return 0;
      default: return 1000;
    }
  }

  toData(): RobotData {
    return { ...this.data };
  }
}
