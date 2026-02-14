import { Router, Request, Response } from 'express';
import { WarehouseSimulation } from '../simulation/WarehouseSimulation';
import { EventType, RobotId } from '../types';

export function setupApiRoutes(simulation: WarehouseSimulation): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'operational',
      uptime: process.uptime(),
      vultr: true,
      message: 'Powered by Vultr',
      timestamp: Date.now(),
    });
  });

  // Full warehouse state
  router.get('/state', (_req: Request, res: Response) => {
    res.json(simulation.getFullState());
  });

  // Trigger manual event
  router.post('/event', (req: Request, res: Response) => {
    const { type, location } = req.body as {
      type?: EventType;
      location?: { x: number; y: number };
    };

    if (!type) {
      res.status(400).json({ error: 'Event type required' });
      return;
    }

    const validTypes: EventType[] = ['PACKAGE_DROP', 'SPILL', 'HUMAN_ENTRY', 'CONGESTION', 'BATTERY_LOW'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid event type' });
      return;
    }

    const event = simulation.triggerManualEvent(type, location);
    res.json({ success: true, event });
  });

  // Send command to robot
  router.post('/robot/:id/command', (req: Request, res: Response) => {
    const robotId = req.params.id as RobotId;
    const { command, params } = req.body as {
      command: string;
      params: Record<string, unknown>;
    };

    const validIds: RobotId[] = ['R1', 'R2', 'R3', 'R4'];
    if (!validIds.includes(robotId)) {
      res.status(400).json({ error: 'Invalid robot ID' });
      return;
    }

    const success = simulation.sendRobotCommand(robotId, command, params || {});
    res.json({ success, robotId, command });
  });

  // Event logs
  router.get('/logs', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(simulation.getLogs(limit));
  });

  // Metrics
  router.get('/metrics', (_req: Request, res: Response) => {
    res.json(simulation.getMetrics());
  });

  return router;
}
