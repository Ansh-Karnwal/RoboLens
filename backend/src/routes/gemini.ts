import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiPromptState, GeminiResponse, EventType, SimulationEvent } from '../types';

const router = Router();

let genAI: GoogleGenerativeAI | null = null;
let lastCallTime = 0;
const DEBOUNCE_MS = 3000;

function initGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[Gemini] No API key configured — using fallback logic');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

function buildPrompt(state: GeminiPromptState, newEvent: { type: string; location: { x: number; y: number }; description: string }): string {
  return `You are RoboLens, an AI orchestration system for a warehouse robot fleet.

Current warehouse state:

Robots: ${JSON.stringify(state.robots, null, 2)}
Active events: ${JSON.stringify(state.activeEvents, null, 2)}
Zone occupancy: ${JSON.stringify(state.zoneOccupancy)}
Human worker position: ${JSON.stringify(state.humanWorkerPosition)}

New event: ${JSON.stringify(newEvent)}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "reasoning": "brief explanation of decision",
  "assignments": [
    {
      "robotId": "R1",
      "taskType": "PICKUP|CLEAN|ESCORT|RECHARGE|STANDBY",
      "priority": 1,
      "targetLocation": {"x": 0, "y": 0},
      "reason": "why this robot was chosen"
    }
  ],
  "alerts": ["any safety alerts or system warnings"]
}

Rules:
- Only assign robots that are IDLE or have short queues
- Prioritize safety: if a human is present, pause nearby robots
- Consider battery levels: don't send low-battery robots on long trips
- Prefer the nearest available robot for efficiency
- You may assign multiple robots if needed`;
}

function fallbackAssignment(state: GeminiPromptState, eventType: string, location: { x: number; y: number }): GeminiResponse {
  const taskTypeMap: Record<string, string> = {
    PACKAGE_DROP: 'PICKUP',
    SPILL: 'CLEAN',
    HUMAN_ENTRY: 'ESCORT',
    CONGESTION: 'STANDBY',
    BATTERY_LOW: 'RECHARGE',
  };

  const taskType = taskTypeMap[eventType] || 'STANDBY';

  // Find nearest available robot
  const available = state.robots
    .filter(r => (r.state === 'IDLE' || r.state === 'CHARGING') && r.battery > 20 && r.queueLength < 3)
    .sort((a, b) => {
      const distA = Math.abs(a.position.x - location.x) + Math.abs(a.position.y - location.y);
      const distB = Math.abs(b.position.x - location.x) + Math.abs(b.position.y - location.y);
      return distA - distB;
    });

  if (available.length === 0) {
    return {
      reasoning: 'No available robots. All robots are busy or have low battery. Task queued.',
      assignments: [],
      alerts: ['All robots occupied — task may be delayed'],
      fallback: true,
    };
  }

  const chosen = available[0];
  return {
    reasoning: `Fallback logic: Assigned nearest available robot ${chosen.id} (distance: ${Math.abs(chosen.position.x - location.x) + Math.abs(chosen.position.y - location.y)} tiles, battery: ${chosen.battery}%)`,
    assignments: [
      {
        robotId: chosen.id,
        taskType: taskType as GeminiResponse['assignments'][0]['taskType'],
        priority: eventType === 'HUMAN_ENTRY' ? 5 : 3,
        targetLocation: location,
        reason: `Nearest available robot with sufficient battery`,
      },
    ],
    alerts: [],
    fallback: true,
  };
}

export async function analyzeWithGemini(
  state: GeminiPromptState,
  event: { type: string; location: { x: number; y: number }; description: string }
): Promise<GeminiResponse> {
  const now = Date.now();
  if (now - lastCallTime < DEBOUNCE_MS) {
    return fallbackAssignment(state, event.type, event.location);
  }
  lastCallTime = now;

  if (!genAI) {
    genAI = initGemini();
  }

  if (!genAI) {
    return fallbackAssignment(state, event.type, event.location);
  }

  try {
    const startTime = Date.now();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = buildPrompt(state, event);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean markdown fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as GeminiResponse;
    parsed.latency = Date.now() - startTime;
    parsed.fallback = false;

    return parsed;
  } catch (error) {
    console.error('[Gemini] API error:', error);
    const fb = fallbackAssignment(state, event.type, event.location);
    fb.reasoning = `AI Unavailable — Using Fallback Logic. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return fb;
  }
}

export function setupGeminiRoutes(
  getState: () => GeminiPromptState,
  applyAssignments: (assignments: GeminiResponse['assignments']) => void
): Router {
  router.post('/analyze', async (req: Request, res: Response) => {
    try {
      const { event } = req.body as { event?: { type: string; location: { x: number; y: number }; description: string } };
      const state = getState();
      const eventData = event || {
        type: 'PACKAGE_DROP',
        location: { x: 10, y: 7 },
        description: 'Manual analysis request',
      };

      const response = await analyzeWithGemini(state, eventData);
      if (response.assignments.length > 0) {
        applyAssignments(response.assignments);
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Gemini analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
