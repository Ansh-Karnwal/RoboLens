import { v4 as uuid } from 'uuid';
import { EventType, HumanWorker, Position, SimulationEvent, TileType } from '../types';

interface EventTiming {
  minInterval: number;
  maxInterval: number;
  lastGenerated: number;
  nextInterval: number;
}

export class EventGenerator {
  private grid: TileType[][];
  private timings: Record<string, EventTiming>;
  private walkablePositions: Position[] = [];

  constructor(grid: TileType[][]) {
    this.grid = grid;
    this.cacheWalkablePositions();

    this.timings = {
      PACKAGE_DROP: {
        minInterval: 20000,
        maxInterval: 40000,
        lastGenerated: Date.now(),
        nextInterval: this.randomBetween(20000, 40000),
      },
      SPILL: {
        minInterval: 60000,
        maxInterval: 90000,
        lastGenerated: Date.now(),
        nextInterval: this.randomBetween(60000, 90000),
      },
      HUMAN_ENTRY: {
        minInterval: 30000,
        maxInterval: 50000,
        lastGenerated: Date.now(),
        nextInterval: this.randomBetween(30000, 50000),
      },
    };
  }

  private cacheWalkablePositions(): void {
    this.walkablePositions = [];
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        if (this.grid[y][x] !== 'OBSTACLE') {
          this.walkablePositions.push({ x, y });
        }
      }
    }
  }

  tick(elapsed: number, speedMultiplier: number): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    const now = Date.now();
    const scaledElapsed = elapsed * speedMultiplier;

    for (const [eventType, timing] of Object.entries(this.timings)) {
      const scaledInterval = timing.nextInterval / speedMultiplier;
      if (now - timing.lastGenerated >= scaledInterval) {
        const event = this.generateEvent(eventType as EventType);
        if (event) events.push(event);
        timing.lastGenerated = now;
        timing.nextInterval = this.randomBetween(timing.minInterval, timing.maxInterval);
      }
    }

    return events;
  }

  generateEvent(type: EventType): SimulationEvent | null {
    const location = this.getRandomWalkablePosition();
    if (!location) return null;

    const descriptions: Record<EventType, string> = {
      PACKAGE_DROP: `Package detected at (${location.x}, ${location.y})`,
      SPILL: `Spill reported at (${location.x}, ${location.y})`,
      HUMAN_ENTRY: `Human worker entered zone near (${location.x}, ${location.y})`,
      CONGESTION: `Congestion detected near (${location.x}, ${location.y})`,
      BATTERY_LOW: `Low battery alert`,
    };

    const priorities: Record<EventType, number> = {
      PACKAGE_DROP: 3,
      SPILL: 4,
      HUMAN_ENTRY: 5,
      CONGESTION: 2,
      BATTERY_LOW: 4,
    };

    return {
      id: uuid(),
      type,
      location,
      priority: priorities[type],
      timestamp: Date.now(),
      description: descriptions[type],
      resolved: false,
    };
  }

  generateManualEvent(type: EventType, location?: Position): SimulationEvent {
    const pos = location || this.getRandomWalkablePosition() || { x: 10, y: 7 };

    const descriptions: Record<EventType, string> = {
      PACKAGE_DROP: `Manual: Package placed at (${pos.x}, ${pos.y})`,
      SPILL: `Manual: Spill created at (${pos.x}, ${pos.y})`,
      HUMAN_ENTRY: `Manual: Human worker deployed near (${pos.x}, ${pos.y})`,
      CONGESTION: `Manual: Congestion alert at (${pos.x}, ${pos.y})`,
      BATTERY_LOW: `Manual: Battery alert triggered`,
    };

    const priorities: Record<EventType, number> = {
      PACKAGE_DROP: 3,
      SPILL: 4,
      HUMAN_ENTRY: 5,
      CONGESTION: 2,
      BATTERY_LOW: 4,
    };

    return {
      id: uuid(),
      type,
      location: pos,
      priority: priorities[type],
      timestamp: Date.now(),
      description: descriptions[type],
      resolved: false,
    };
  }

  generateHumanWorker(): HumanWorker {
    // Human walks across Zone A
    const path: Position[] = [];
    const startY = this.randomBetween(10, 14);
    for (let x = 0; x <= 5; x++) {
      if (this.grid[startY]?.[x] !== 'OBSTACLE') {
        path.push({ x, y: startY });
      }
    }
    if (path.length === 0) {
      path.push({ x: 2, y: 12 });
    }

    return {
      position: { ...path[0] },
      path,
      pathIndex: 0,
      active: true,
    };
  }

  private getRandomWalkablePosition(): Position | null {
    if (this.walkablePositions.length === 0) return null;
    const idx = Math.floor(Math.random() * this.walkablePositions.length);
    return { ...this.walkablePositions[idx] };
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
