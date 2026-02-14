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

      // Also call Gemini for AI reasoning
      const state = simulation.getGeminiPromptState();
      const geminiResponse = await analyzeWithGemini(state, {
        type: event.type,
        location: event.location,
        description: event.description,
      });

      if (geminiResponse.assignments.length > 0 && !geminiResponse.fallback) {
        simulation.applyGeminiAssignments(geminiResponse.assignments);
      }

      wsManager.broadcast('gemini:response', geminiResponse as unknown as Record<string, unknown>);
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
