import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { WarehouseSimulation } from './simulation/WarehouseSimulation';
import { WebSocketManager } from './websocket/WebSocketManager';
import { setupApiRoutes } from './routes/api';
import { setupGeminiRoutes, analyzeWithGemini } from './routes/gemini';
import { ClientWSMessage, EventType } from './types';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const TICK_MS = parseInt(process.env.SIMULATION_TICK_MS || '100', 10);

// Create Express app
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize simulation
const simulation = new WarehouseSimulation(TICK_MS);

// Initialize WebSocket
const wsManager = new WebSocketManager(server);

// Wire simulation broadcasts to WebSocket
simulation.setCallback((type, data) => {
  wsManager.broadcast(type, data);
});

// Handle WebSocket messages from clients
wsManager.setMessageHandler(async (msg: ClientWSMessage) => {
  switch (msg.type) {
    case 'robot:manual': {
      const { robotId, destination } = msg.data;
      simulation.sendRobotCommand(robotId, 'move', { destination });
      break;
    }
    case 'event:trigger': {
      const { type, location } = msg.data;
      const event = simulation.triggerManualEvent(type as EventType, location);

      // 1. Run workflow engine first
      const workflowResult = simulation.executeWorkflow(event);

      // 2. Only call Gemini for SPILL and PACKAGE_DROP events
      const geminiEventTypes: EventType[] = ['SPILL', 'PACKAGE_DROP'];
      const shouldCallGemini = geminiEventTypes.includes(event.type as EventType) &&
        (workflowResult.needsGemini || workflowResult.actions.length === 0);

      if (shouldCallGemini) {
        const state = simulation.getGeminiPromptState();
        const geminiResponse = await analyzeWithGemini(state, {
          type: event.type,
          location: event.location,
          description: event.description,
        });

        if (geminiResponse.assignments.length > 0) {
          simulation.applyGeminiAssignments(geminiResponse.assignments);
        }

        wsManager.broadcast('gemini:response', geminiResponse as unknown as Record<string, unknown>);
      } else if (!geminiEventTypes.includes(event.type as EventType)) {
        // Signal frontend that Gemini is not needed for this event type
        wsManager.broadcast('gemini:skipped', { eventType: event.type } as unknown as Record<string, unknown>);
      }

      // 3. Resolve the event now that it's been handled
      simulation.resolveEvent(event.id);
      break;
    }
    case 'event:clear': {
      simulation.clearAllEvents();
      break;
    }
    case 'workflow:sync': {
      const { nodes, edges } = msg.data;
      simulation.updateWorkflow(nodes, edges);
      break;
    }
    case 'simulation:speed': {
      simulation.setSpeed(msg.data.multiplier);
      break;
    }
    case 'workflow:activate': {
      wsManager.broadcast('workflow:execute', {
        nodeId: msg.data.workflowId,
        status: msg.data.active ? 'active' : 'inactive',
      });
      break;
    }
  }
});

// API routes
app.use('/api', setupApiRoutes(simulation));
app.use(
  '/api/gemini',
  setupGeminiRoutes(
    () => simulation.getGeminiPromptState(),
    (assignments) => simulation.applyGeminiAssignments(assignments)
  )
);

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║           RoboLens Backend Server             ║
  ║         Powered by Vultr                      ║
  ╠═══════════════════════════════════════════════╣
  ║  REST API:    http://localhost:${PORT}/api      ║
  ║  WebSocket:   ws://localhost:${PORT}            ║
  ║  Health:      http://localhost:${PORT}/api/health║
  ╚═══════════════════════════════════════════════╝
  `);

  // Start the simulation loop
  simulation.start();
  console.log('[Simulation] Started with tick interval:', TICK_MS, 'ms');
});
