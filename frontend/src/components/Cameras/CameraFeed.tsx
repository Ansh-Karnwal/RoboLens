import { useRef, useEffect, useCallback } from 'react';
import { RobotData, SimulationEvent, HumanWorker, Position, TileType } from '../../types';

interface CameraFeedProps {
  robot: RobotData;
  allRobots: RobotData[];
  activeEvents: SimulationEvent[];
  humanWorker: HumanWorker | null;
  grid: TileType[][];
  obstacles: Position[];
}

const FEED_W = 384;
const FEED_H = 288;
const VIEW_RADIUS = 5; // tiles visible in each direction
const TILE_PX = FEED_W / (VIEW_RADIUS * 2 + 1);

const ZONE_COLORS: Record<string, string> = {
  ZONE_A: 'rgba(0, 212, 255, 0.12)',
  ZONE_B: 'rgba(168, 85, 247, 0.12)',
  ZONE_C: 'rgba(0, 255, 136, 0.12)',
  ZONE_D: 'rgba(255, 204, 0, 0.12)',
};

const ZONE_NAMES: Record<string, string> = {
  ZONE_A: 'PICKUP',
  ZONE_B: 'STORAGE',
  ZONE_C: 'DELIVERY',
  ZONE_D: 'CHARGING',
};

export default function CameraFeed({
  robot,
  allRobots,
  activeEvents,
  humanWorker,
  grid,
  obstacles,
}: CameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef(0);
  const tickRef = useRef(0);
  const noiseRef = useRef<ImageData | null>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      tickRef.current++;
      const t = tickRef.current;
      const cx = robot.position.x;
      const cy = robot.position.y;

      // --- Background: dark with slight green night-vision tint ---
      ctx.fillStyle = '#040a04';
      ctx.fillRect(0, 0, FEED_W, FEED_H);

      // --- Render visible grid tiles ---
      for (let dy = -VIEW_RADIUS; dy <= VIEW_RADIUS; dy++) {
        for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
          const wx = cx + dx;
          const wy = cy + dy;
          const sx = (dx + VIEW_RADIUS) * TILE_PX;
          const sy = (dy + VIEW_RADIUS) * TILE_PX;

          // Out of bounds
          if (wx < 0 || wx >= 20 || wy < 0 || wy >= 15) {
            ctx.fillStyle = '#020502';
            ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
            continue;
          }

          const tile = grid[wy]?.[wx];

          // Floor with night-vision tint
          ctx.fillStyle = '#0a1a0a';
          ctx.fillRect(sx, sy, TILE_PX, TILE_PX);

          // Zone overlay
          if (tile && ZONE_COLORS[tile]) {
            ctx.fillStyle = ZONE_COLORS[tile];
            ctx.fillRect(sx, sy, TILE_PX, TILE_PX);
          }

          // Grid lines (faint green)
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.06)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx, sy, TILE_PX, TILE_PX);

          // Obstacles
          if (tile === 'OBSTACLE') {
            ctx.fillStyle = '#1a2a1a';
            ctx.fillRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 3, sy + 3, TILE_PX - 6, TILE_PX - 6);
          }
        }
      }

      // --- Detect & draw other robots with bounding boxes ---
      const otherRobots = allRobots.filter(r => r.id !== robot.id);
      for (const other of otherRobots) {
        const dx = other.position.x - cx;
        const dy = other.position.y - cy;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) continue;

        const sx = (dx + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;
        const sy = (dy + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;

        // Robot dot
        ctx.fillStyle = other.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();

        // CV Bounding box
        const boxSize = TILE_PX * 0.85;
        const bx = sx - boxSize / 2;
        const by = sy - boxSize / 2;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);

        // Corner brackets instead of full rectangle
        const corner = 8;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + corner); ctx.lineTo(bx, by); ctx.lineTo(bx + corner, by);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(bx + boxSize - corner, by); ctx.lineTo(bx + boxSize, by); ctx.lineTo(bx + boxSize, by + corner);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bx, by + boxSize - corner); ctx.lineTo(bx, by + boxSize); ctx.lineTo(bx + corner, by + boxSize);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bx + boxSize - corner, by + boxSize); ctx.lineTo(bx + boxSize, by + boxSize); ctx.lineTo(bx + boxSize, by + boxSize - corner);
        ctx.stroke();

        // Label with confidence
        const conf = (95 + Math.sin(t * 0.03 + other.id.charCodeAt(1)) * 4).toFixed(1);
        const label = `ROBOT_${other.id} [${conf}%]`;
        ctx.font = '9px "Space Mono", monospace';
        const labelW = ctx.measureText(label).width + 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bx, by - 14, labelW, 13);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(label, bx + 3, by - 4);

        // State sublabel
        ctx.font = '7px "Space Mono", monospace';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.fillText(`${other.state} | BAT:${Math.round(other.battery)}%`, bx + 3, by + boxSize + 10);

        // Tracking trail line
        if (other.state === 'MOVING' && other.path.length > 0) {
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          for (const p of other.path.slice(0, 4)) {
            const px = (p.x - cx + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;
            const py = (p.y - cy + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // --- Events (packages, spills) with detection boxes ---
      for (const event of activeEvents.slice(-10)) {
        const dx = event.location.x - cx;
        const dy = event.location.y - cy;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) continue;

        const sx = (dx + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;
        const sy = (dy + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;

        let color = '#ff6b35';
        let label = 'UNKNOWN';
        let conf = '92.3';

        if (event.type === 'PACKAGE_DROP') {
          color = '#00d4ff';
          label = 'PACKAGE';
          conf = (93 + Math.sin(t * 0.05) * 5).toFixed(1);
          // Package icon
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(sx - 6, sy - 6, 12, 12);
          ctx.strokeStyle = '#D2691E';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx - 6, sy - 6, 12, 12);
        } else if (event.type === 'SPILL') {
          color = '#ff6b35';
          label = 'HAZARD_SPILL';
          conf = (89 + Math.sin(t * 0.07) * 6).toFixed(1);
          // Spill
          ctx.fillStyle = 'rgba(255, 107, 53, 0.5)';
          ctx.beginPath();
          ctx.arc(sx, sy, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bounding box
        const bs = TILE_PX * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(sx - bs / 2, sy - bs / 2, bs, bs);
        ctx.setLineDash([]);

        // Label
        const fullLabel = `${label} [${conf}%]`;
        ctx.font = '8px "Space Mono", monospace';
        const lw = ctx.measureText(fullLabel).width + 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(sx - bs / 2, sy - bs / 2 - 12, lw, 11);
        ctx.fillStyle = color;
        ctx.fillText(fullLabel, sx - bs / 2 + 3, sy - bs / 2 - 3);
      }

      // --- Human worker with detection ---
      if (humanWorker?.active) {
        const dx = humanWorker.position.x - cx;
        const dy = humanWorker.position.y - cy;
        if (Math.abs(dx) <= VIEW_RADIUS && Math.abs(dy) <= VIEW_RADIUS) {
          const sx = (dx + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;
          const sy = (dy + VIEW_RADIUS) * TILE_PX + TILE_PX / 2;

          // Human figure
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.arc(sx, sy - 5, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(sx - 3, sy + 1, 6, 8);

          // Warning bounding box (red/yellow)
          const bs = TILE_PX;
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          const flash = Math.sin(t * 0.15) > 0;
          if (flash) {
            ctx.strokeRect(sx - bs / 2, sy - bs / 2, bs, bs);
          }

          // Label
          const conf = (98 + Math.sin(t * 0.04) * 1.5).toFixed(1);
          const label = `HUMAN_WORKER [${conf}%]`;
          ctx.font = '9px "Space Mono", monospace';
          const lw = ctx.measureText(label).width + 6;
          ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
          ctx.fillRect(sx - bs / 2, sy - bs / 2 - 14, lw, 13);
          ctx.fillStyle = '#ff4444';
          ctx.fillText(label, sx - bs / 2 + 3, sy - bs / 2 - 4);

          // CAUTION sublabel
          ctx.font = 'bold 7px "Space Mono", monospace';
          ctx.fillStyle = '#ff0000';
          ctx.fillText('⚠ SAFETY ZONE ACTIVE', sx - bs / 2 + 3, sy + bs / 2 + 10);
        }
      }

      // --- Self indicator (center crosshair) ---
      const selfX = VIEW_RADIUS * TILE_PX + TILE_PX / 2;
      const selfY = VIEW_RADIUS * TILE_PX + TILE_PX / 2;

      // Self glow
      ctx.fillStyle = robot.color + '15';
      ctx.beginPath();
      ctx.arc(selfX, selfY, TILE_PX * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair
      ctx.strokeStyle = robot.color + '60';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(selfX - 15, selfY); ctx.lineTo(selfX - 5, selfY);
      ctx.moveTo(selfX + 5, selfY); ctx.lineTo(selfX + 15, selfY);
      ctx.moveTo(selfX, selfY - 15); ctx.lineTo(selfX, selfY - 5);
      ctx.moveTo(selfX, selfY + 5); ctx.lineTo(selfX, selfY + 15);
      ctx.stroke();

      // Center circle
      ctx.strokeStyle = robot.color + '40';
      ctx.beginPath();
      ctx.arc(selfX, selfY, 3, 0, Math.PI * 2);
      ctx.stroke();

      // --- Noise grain overlay ---
      if (!noiseRef.current || t % 3 === 0) {
        const noise = ctx.createImageData(FEED_W, FEED_H);
        for (let i = 0; i < noise.data.length; i += 4) {
          const v = Math.random() * 12;
          noise.data[i] = v;
          noise.data[i + 1] = v;
          noise.data[i + 2] = v;
          noise.data[i + 3] = 15;
        }
        noiseRef.current = noise;
      }
      ctx.putImageData(noiseRef.current, 0, 0);

      // --- Scanlines ---
      for (let y = 0; y < FEED_H; y += 3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, y, FEED_W, 1);
      }

      // --- HUD Overlay ---
      // Top bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, FEED_W, 22);

      // Camera ID
      ctx.font = 'bold 10px "Space Mono", monospace';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`CAM-${robot.id}  ONBOARD`, 6, 6);

      // REC indicator
      const recOn = Math.sin(t * 0.08) > 0;
      if (recOn) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(FEED_W - 48, 11, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '9px "Space Mono", monospace';
      ctx.fillStyle = recOn ? '#ff0000' : '#660000';
      ctx.textAlign = 'right';
      ctx.fillText('REC', FEED_W - 6, 6);

      // Bottom bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, FEED_H - 32, FEED_W, 32);

      ctx.font = '8px "Space Mono", monospace';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      // Timestamp
      const now = new Date();
      const ts = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      ctx.fillText(`${ts}.${ms}`, 6, FEED_H - 20);

      // Position
      ctx.fillText(`POS: (${robot.position.x}, ${robot.position.y})  HDG: ${(t * 0.5 % 360).toFixed(0)}°`, 6, FEED_H - 8);

      // FPS + resolution
      ctx.textAlign = 'right';
      ctx.fillText(`384x288 | 30FPS | IR-NV`, FEED_W - 6, FEED_H - 20);

      // Detection count
      const detections = otherRobots.filter(r => {
        const ddx = r.position.x - cx;
        const ddy = r.position.y - cy;
        return Math.abs(ddx) <= VIEW_RADIUS && Math.abs(ddy) <= VIEW_RADIUS;
      }).length;
      const eventDet = activeEvents.filter(e => {
        const ddx = e.location.x - cx;
        const ddy = e.location.y - cy;
        return Math.abs(ddx) <= VIEW_RADIUS && Math.abs(ddy) <= VIEW_RADIUS;
      }).length;
      const humanDet = humanWorker?.active &&
        Math.abs(humanWorker.position.x - cx) <= VIEW_RADIUS &&
        Math.abs(humanWorker.position.y - cy) <= VIEW_RADIUS ? 1 : 0;
      const totalDet = detections + eventDet + humanDet;

      ctx.fillStyle = totalDet > 0 ? '#00ff00' : '#004400';
      ctx.fillText(`OBJ: ${totalDet} DETECTED`, FEED_W - 6, FEED_H - 8);

      // Status & battery bar (top-right area)
      ctx.textAlign = 'right';
      ctx.font = '8px "Space Mono", monospace';
      ctx.fillStyle = robot.state === 'PAUSED' ? '#ffcc00' : robot.state === 'CHARGING' ? '#00ff88' : '#00ff00';
      ctx.fillText(robot.state, FEED_W - 60, 6);

      // Battery bar in HUD
      const batW = 40;
      const batH = 6;
      const batX = FEED_W - 55;
      const batY = 26;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(batX - 2, batY - 2, batW + 4, batH + 4);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(batX, batY, batW, batH);
      const batColor = robot.battery > 50 ? '#00ff00' : robot.battery > 20 ? '#ffcc00' : '#ff0000';
      ctx.fillStyle = batColor;
      ctx.fillRect(batX, batY, (batW * robot.battery) / 100, batH);
      ctx.font = '7px "Space Mono", monospace';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(robot.battery)}%`, batX + batW + 4, batY + 6);

      // Reset
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
    [robot, allRobots, activeEvents, humanWorker, grid, obstacles]
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
    <canvas
      ref={canvasRef}
      width={FEED_W}
      height={FEED_H}
      className="w-full h-full rounded"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
