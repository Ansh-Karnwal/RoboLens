import { useRef, useEffect, useCallback } from 'react';
import { RobotData, HumanWorker, SimulationEvent, Position, TileType } from '../../types';

interface WarehouseCanvasProps {
  robots: RobotData[];
  grid: TileType[][];
  obstacles: Position[];
  humanWorker: HumanWorker | null;
  activeEvents: SimulationEvent[];
}

const GRID_W = 20;
const GRID_H = 15;
const CANVAS_W = 800;
const CANVAS_H = 600;
const TILE_W = CANVAS_W / GRID_W;
const TILE_H = CANVAS_H / GRID_H;

const ZONE_COLORS: Record<string, string> = {
  ZONE_A: 'rgba(0, 212, 255, 0.08)',
  ZONE_B: 'rgba(168, 85, 247, 0.08)',
  ZONE_C: 'rgba(0, 255, 136, 0.08)',
  ZONE_D: 'rgba(255, 204, 0, 0.08)',
};

const ZONE_BORDER_COLORS: Record<string, string> = {
  ZONE_A: 'rgba(0, 212, 255, 0.3)',
  ZONE_B: 'rgba(168, 85, 247, 0.3)',
  ZONE_C: 'rgba(0, 255, 136, 0.3)',
  ZONE_D: 'rgba(255, 204, 0, 0.3)',
};

const ZONE_LABELS: Record<string, { label: string; sub: string; x: number; y: number }> = {
  ZONE_A: { label: 'ZONE A', sub: 'Pickup', x: 2.5, y: 12 },
  ZONE_B: { label: 'ZONE B', sub: 'Storage', x: 11, y: 7 },
  ZONE_C: { label: 'ZONE C', sub: 'Delivery', x: 17, y: 12 },
  ZONE_D: { label: 'ZONE D', sub: 'Charging', x: 1.5, y: 1.5 },
};

export default function WarehouseCanvas({
  robots,
  grid,
  obstacles,
  humanWorker,
  activeEvents,
}: WarehouseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);
  const tickRef = useRef(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      tickRef.current++;
      const t = tickRef.current;

      // Clear
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid lines
      ctx.strokeStyle = '#1a2035';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= GRID_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_W, 0);
        ctx.lineTo(x * TILE_W, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 0; y <= GRID_H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_H);
        ctx.lineTo(CANVAS_W, y * TILE_H);
        ctx.stroke();
      }

      // Zone fills
      if (grid.length > 0) {
        for (let y = 0; y < GRID_H; y++) {
          for (let x = 0; x < GRID_W; x++) {
            const tile = grid[y]?.[x];
            if (tile && ZONE_COLORS[tile]) {
              ctx.fillStyle = ZONE_COLORS[tile];
              ctx.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);

              // Zone border
              ctx.strokeStyle = ZONE_BORDER_COLORS[tile] || '#1f2937';
              ctx.lineWidth = 1;
              ctx.strokeRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
            }
          }
        }
      }

      // Zone labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [, info] of Object.entries(ZONE_LABELS)) {
        ctx.font = '600 14px Rajdhani, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(info.label, info.x * TILE_W, info.y * TILE_H - 8);
        ctx.font = '11px "Space Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(info.sub, info.x * TILE_W, info.y * TILE_H + 10);
      }

      // Obstacles
      for (const obs of obstacles) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(
          obs.x * TILE_W + 2,
          obs.y * TILE_H + 2,
          TILE_W - 4,
          TILE_H - 4
        );
        // Shelf pattern
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          obs.x * TILE_W + 4,
          obs.y * TILE_H + 4,
          TILE_W - 8,
          TILE_H - 8
        );
        ctx.beginPath();
        ctx.moveTo(obs.x * TILE_W + TILE_W / 2, obs.y * TILE_H + 6);
        ctx.lineTo(obs.x * TILE_W + TILE_W / 2, obs.y * TILE_H + TILE_H - 6);
        ctx.stroke();
      }

      // Active events
      for (const event of activeEvents.slice(-10)) {
        const ex = event.location.x * TILE_W + TILE_W / 2;
        const ey = event.location.y * TILE_H + TILE_H / 2;

        if (event.type === 'PACKAGE_DROP') {
          // Brown package
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(ex - 8, ey - 8, 16, 16);
          ctx.strokeStyle = '#D2691E';
          ctx.lineWidth = 1;
          ctx.strokeRect(ex - 8, ey - 8, 16, 16);
          ctx.beginPath();
          ctx.moveTo(ex, ey - 8);
          ctx.lineTo(ex, ey + 8);
          ctx.moveTo(ex - 8, ey);
          ctx.lineTo(ex + 8, ey);
          ctx.stroke();
        } else if (event.type === 'SPILL') {
          // Orange splat
          const pulse = Math.sin(t * 0.1) * 2;
          ctx.fillStyle = 'rgba(255, 107, 53, 0.6)';
          ctx.beginPath();
          ctx.arc(ex, ey, 10 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 107, 53, 0.3)';
          ctx.beginPath();
          ctx.arc(ex - 4, ey + 3, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Human worker
      if (humanWorker?.active) {
        const hx = humanWorker.position.x * TILE_W + TILE_W / 2;
        const hy = humanWorker.position.y * TILE_H + TILE_H / 2;

        // Safety radius
        ctx.fillStyle = 'rgba(255, 204, 0, 0.08)';
        ctx.beginPath();
        ctx.arc(hx, hy, TILE_W * 3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(hx, hy - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        // Torso
        ctx.fillRect(hx - 4, hy, 8, 10);
        // Label
        ctx.font = '9px "Space Mono", monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.fillText('HUMAN', hx, hy + 24);
      }

      // Robot paths (dotted preview)
      for (const robot of robots) {
        if (robot.path.length > 0) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = robot.color + '40';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(
            robot.position.x * TILE_W + TILE_W / 2,
            robot.position.y * TILE_H + TILE_H / 2
          );
          for (const p of robot.path) {
            ctx.lineTo(p.x * TILE_W + TILE_W / 2, p.y * TILE_H + TILE_H / 2);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Task assignment arrow
        if (robot.targetPosition) {
          const fromX = robot.position.x * TILE_W + TILE_W / 2;
          const fromY = robot.position.y * TILE_H + TILE_H / 2;
          const toX = robot.targetPosition.x * TILE_W + TILE_W / 2;
          const toY = robot.targetPosition.y * TILE_H + TILE_H / 2;

          // Animated dash offset
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -t * 0.5;
          ctx.strokeStyle = robot.color + '30';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;

          // Target marker
          const pulse = Math.sin(t * 0.08) * 3;
          ctx.strokeStyle = robot.color + '50';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(toX, toY, 8 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Robots
      for (const robot of robots) {
        const rx = robot.position.x * TILE_W + TILE_W / 2;
        const ry = robot.position.y * TILE_H + TILE_H / 2;
        const radius = 14;

        // State-based effects
        if (robot.state === 'IDLE') {
          // Pulsing glow
          const pulse = Math.sin(t * 0.05) * 0.3 + 0.7;
          ctx.fillStyle = robot.color + Math.floor(pulse * 30).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(rx, ry, radius + 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (robot.state === 'PAUSED') {
          // Flashing yellow
          const flash = Math.sin(t * 0.15) > 0;
          if (flash) {
            ctx.fillStyle = 'rgba(255, 204, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(rx, ry, radius + 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (robot.state === 'CHARGING') {
          // Green pulse
          const pulse = Math.sin(t * 0.08) * 0.3 + 0.5;
          ctx.fillStyle = `rgba(0, 255, 136, ${pulse * 0.3})`;
          ctx.beginPath();
          ctx.arc(rx, ry, radius + 8, 0, Math.PI * 2);
          ctx.fill();
          // Lightning bolt
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rx - 3, ry - 10);
          ctx.lineTo(rx + 1, ry - 2);
          ctx.lineTo(rx - 2, ry - 2);
          ctx.lineTo(rx + 3, ry + 10);
          ctx.stroke();
        }

        // Robot body
        ctx.fillStyle = robot.color;
        ctx.beginPath();
        ctx.arc(rx, ry, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring
        ctx.strokeStyle = '#0a0e1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, radius - 3, 0, Math.PI * 2);
        ctx.stroke();

        // Working state spinner
        if (robot.state === 'WORKING') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          const angle = (t * 0.1) % (Math.PI * 2);
          ctx.beginPath();
          ctx.arc(rx, ry, radius + 4, angle, angle + Math.PI * 1.2);
          ctx.stroke();
        }

        // Moving trail
        if (robot.state === 'MOVING') {
          ctx.fillStyle = robot.color + '20';
          ctx.beginPath();
          ctx.arc(rx, ry, radius + 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Robot ID label
        ctx.font = 'bold 10px "Space Mono", monospace';
        ctx.fillStyle = '#0a0e1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(robot.id, rx, ry);

        // Battery indicator
        const batW = 20;
        const batH = 4;
        const batX = rx - batW / 2;
        const batY = ry + radius + 4;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(batX, batY, batW, batH);
        const batColor =
          robot.battery > 50 ? '#00ff88' : robot.battery > 20 ? '#ffcc00' : '#ff4444';
        ctx.fillStyle = batColor;
        ctx.fillRect(batX, batY, (batW * robot.battery) / 100, batH);

        // State label
        ctx.font = '8px "Space Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(robot.state, rx, ry + radius + 14);
      }
    },
    [robots, grid, obstacles, humanWorker, activeEvents]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      draw(ctx);
      animFrame.current = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animFrame.current);
  }, [draw]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-lg border border-rl-border"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="scanline-overlay rounded-lg" />
    </div>
  );
}
