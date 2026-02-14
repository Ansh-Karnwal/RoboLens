import { v4 as uuid } from 'uuid';
import {
  EventType,
  GeminiAssignment,
  Position,
  RobotId,
  SimulationEvent,
  TaskData,
  TaskType,
} from '../types';
import { Robot } from './Robot';

export class TaskManager {
  private completedTasks: TaskData[] = [];
  private responseTimes: number[] = [];

  createTaskFromEvent(event: SimulationEvent): TaskData {
    const taskTypeMap: Record<EventType, TaskType> = {
      PACKAGE_DROP: 'PICKUP',
      SPILL: 'CLEAN',
      HUMAN_ENTRY: 'ESCORT',
      CONGESTION: 'STANDBY',
      BATTERY_LOW: 'RECHARGE',
    };

    return {
      id: uuid(),
      type: taskTypeMap[event.type],
      priority: event.priority,
      location: { ...event.location },
      assignedRobot: null,
      status: 'PENDING',
      timestamp: Date.now(),
      description: event.description,
    };
  }

  assignTaskToNearestRobot(task: TaskData, robots: Robot[]): Robot | null {
    const availableRobots = robots.filter(r => r.isAvailable());
    if (availableRobots.length === 0) {
      // Fall back to robots that are idle even if battery is somewhat low
      const idleRobots = robots.filter(r => r.state === 'IDLE' && r.queueLength < 3);
      if (idleRobots.length === 0) {
        // Queue on robot with shortest queue
        const leastBusy = robots
          .filter(r => r.queueLength < 3)
          .sort((a, b) => a.queueLength - b.queueLength);
        if (leastBusy.length === 0) return null;
        leastBusy[0].assignTask(task);
        return leastBusy[0];
      }
      return this.assignToClosest(task, idleRobots);
    }
    return this.assignToClosest(task, availableRobots);
  }

  private assignToClosest(task: TaskData, candidates: Robot[]): Robot | null {
    if (candidates.length === 0) return null;

    let closest = candidates[0];
    let minDist = this.distance(closest.position, task.location);

    for (const robot of candidates) {
      const dist = this.distance(robot.position, task.location);
      if (dist < minDist) {
        minDist = dist;
        closest = robot;
      }
    }

    closest.assignTask(task);
    return closest;
  }

  assignFromGemini(assignments: GeminiAssignment[], robots: Robot[]): void {
    for (const assignment of assignments) {
      const robot = robots.find(r => r.id === assignment.robotId);
      if (!robot) continue;

      const task: TaskData = {
        id: uuid(),
        type: assignment.taskType,
        priority: assignment.priority,
        location: { ...assignment.targetLocation },
        assignedRobot: assignment.robotId,
        status: 'PENDING',
        timestamp: Date.now(),
        description: assignment.reason,
      };

      robot.assignTask(task);
    }
  }

  recordCompletion(task: TaskData): void {
    this.completedTasks.push(task);
    const responseTime = Date.now() - task.timestamp;
    this.responseTimes.push(responseTime);
  }

  getCompletedCount(): number {
    return this.completedTasks.length;
  }

  getAvgResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  getEfficiency(robots: Robot[]): number {
    const totalBots = robots.length;
    const workingBots = robots.filter(
      r => r.state === 'MOVING' || r.state === 'WORKING'
    ).length;
    if (totalBots === 0) return 0;
    return Math.round((workingBots / totalBots) * 100);
  }

  getTaskTypeDistribution(): Record<TaskType, number> {
    const dist: Record<TaskType, number> = {
      PICKUP: 0,
      CLEAN: 0,
      ESCORT: 0,
      RECHARGE: 0,
      STANDBY: 0,
    };
    for (const task of this.completedTasks) {
      dist[task.type]++;
    }
    return dist;
  }

  getRobotUtilization(robots: Robot[]): Record<RobotId, number> {
    const util: Record<RobotId, number> = {
      R1: 0,
      R2: 0,
      R3: 0,
      R4: 0,
    };
    for (const robot of robots) {
      const busyStates: string[] = ['MOVING', 'WORKING', 'CHARGING'];
      util[robot.id] = busyStates.includes(robot.state) ? 100 : (robot.queueLength > 0 ? 50 : 0);
    }
    return util;
  }

  private distance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
}
