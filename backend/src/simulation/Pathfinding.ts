import { Position, TileType } from '../types';

interface AStarNode {
  position: Position;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class Pathfinding {
  private grid: TileType[][];
  private width: number;
  private height: number;

  constructor(grid: TileType[][]) {
    this.grid = grid;
    this.width = grid[0].length;
    this.height = grid.length;
  }

  updateGrid(grid: TileType[][]): void {
    this.grid = grid;
  }

  findPath(start: Position, end: Position, blockedPositions: Position[] = []): Position[] {
    if (start.x === end.x && start.y === end.y) return [start];

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();
    const blockedSet = new Set(blockedPositions.map(p => `${p.x},${p.y}`));

    const startNode: AStarNode = {
      position: { ...start },
      g: 0,
      h: this.heuristic(start, end),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const key = `${current.position.x},${current.position.y}`;

      if (current.position.x === end.x && current.position.y === end.y) {
        return this.reconstructPath(current);
      }

      closedSet.add(key);

      const neighbors = this.getNeighbors(current.position);
      for (const neighbor of neighbors) {
        const nKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(nKey)) continue;
        if (blockedSet.has(nKey) && !(neighbor.x === end.x && neighbor.y === end.y)) continue;
        if (!this.isWalkable(neighbor)) continue;

        const g = current.g + 1;
        const existingNode = openSet.find(
          n => n.position.x === neighbor.x && n.position.y === neighbor.y
        );

        if (!existingNode) {
          const node: AStarNode = {
            position: neighbor,
            g,
            h: this.heuristic(neighbor, end),
            f: 0,
            parent: current,
          };
          node.f = node.g + node.h;
          openSet.push(node);
        } else if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No path found — return direct line as fallback
    return [start, end];
  }

  private heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getNeighbors(pos: Position): Position[] {
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];
    return dirs
      .map(d => ({ x: pos.x + d.x, y: pos.y + d.y }))
      .filter(p => p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height);
  }

  private isWalkable(pos: Position): boolean {
    return this.grid[pos.y]?.[pos.x] !== 'OBSTACLE';
  }

  private reconstructPath(node: AStarNode): Position[] {
    const path: Position[] = [];
    let current: AStarNode | null = node;
    while (current) {
      path.unshift({ ...current.position });
      current = current.parent;
    }
    return path;
  }
}
