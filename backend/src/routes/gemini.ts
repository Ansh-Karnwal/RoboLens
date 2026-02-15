import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiPromptState, GeminiResponse, EventType, SimulationEvent } from '../types';

const router = Router();

let genAI: GoogleGenerativeAI | null = null;
let lastCallTime = 0;
const DEBOUNCE_MS = 1500;

function initGemini(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[Gemini] No API key configured — using fallback logic');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

function buildPrompt(state: GeminiPromptState, newEvent: { type: string; location: { x: number; y: number }; description: string }): string {
  const eventLoc = newEvent.location;

  const taskTypeMap: Record<string, string> = {
    PACKAGE_DROP: 'PICKUP',
    SPILL: 'CLEAN',
    HUMAN_ENTRY: 'ESCORT',
    CONGESTION: 'STANDBY',
    BATTERY_LOW: 'RECHARGE',
  };
  const requiredTask = taskTypeMap[newEvent.type] || 'STANDBY';
  const priority = newEvent.type === 'HUMAN_ENTRY' ? 5 : newEvent.type === 'SPILL' ? 4 : 3;

  // Pre-compute distance from each robot to the event
  const robotsWithDistance = state.robots.map(r => ({
    ...r,
    battery: Math.round(r.battery),
    distance: Math.abs(r.position.x - eventLoc.x) + Math.abs(r.position.y - eventLoc.y),
  })).sort((a, b) => a.distance - b.distance);

  return `You are RoboLens, an AI coordinator for a 20x15 warehouse with 4 robots.

EVENT: ${newEvent.type} at (${eventLoc.x}, ${eventLoc.y})
REQUIRED TASK: ${requiredTask}

ROBOTS (sorted closest to farthest):
${robotsWithDistance.map(r =>
  `  ${r.id}: pos=(${r.position.x},${r.position.y}) distance=${r.distance} state=${r.state} battery=${r.battery}% currentTask=${r.currentTask || 'none'} queueLength=${r.queueLength}`
).join('\n')}

${state.humanWorkerPosition ? `HUMAN WORKER at (${state.humanWorkerPosition.x}, ${state.humanWorkerPosition.y}) — nearby robots must yield.` : ''}

ASSIGNMENT RULES:
1. Pick EXACTLY ONE robot — the closest IDLE robot with battery > 20%.
2. If no IDLE robot qualifies, pick the closest with queueLength < 3.
3. Never pick a robot with battery < 15%.
4. taskType must be "${requiredTask}", targetLocation must be {"x":${eventLoc.x},"y":${eventLoc.y}}, priority must be ${priority}.

OUTPUT: Respond with ONLY raw JSON, no markdown fences, no extra text.
{"reasoning":"<1 sentence>","assignments":[{"robotId":"<ID>","taskType":"${requiredTask}","priority":${priority},"targetLocation":{"x":${eventLoc.x},"y":${eventLoc.y}},"reason":"<short>"}],"alerts":[]}`;
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const prompt = buildPrompt(state, event);

    // Race against a 10s timeout to prevent indefinite hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timed out after 10s')), 10000)
    );
    const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
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
