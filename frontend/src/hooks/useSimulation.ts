import { useCallback, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { ClientWSMessage, EventType, RobotId, Position } from '../types';
import { Node, Edge } from 'reactflow';

export function useSimulation(send: (msg: ClientWSMessage) => void) {
  const store = useSimulationStore();

  const triggerEvent = useCallback(
    (type: EventType, location?: Position) => {
      // Only show Gemini thinking for event types that actually call Gemini
      const geminiEventTypes: EventType[] = ['SPILL', 'PACKAGE_DROP'];
      if (geminiEventTypes.includes(type)) {
        store.setGeminiThinking(true);
      }
      send({
        type: 'event:trigger',
        data: { type, location },
      });
    },
    [send, store]
  );

  const moveRobot = useCallback(
    (robotId: RobotId, destination: Position) => {
      send({
        type: 'robot:manual',
        data: { robotId, destination },
      });
    },
    [send]
  );

  const setSpeed = useCallback(
    (multiplier: number) => {
      store.setSimulationSpeed(multiplier);
      send({
        type: 'simulation:speed',
        data: { multiplier },
      });
    },
    [send, store]
  );

  const clearEvents = useCallback(() => {
    send({
      type: 'event:clear',
      data: {} as Record<string, never>,
    });
  }, [send]);

  const syncDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncWorkflow = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      clearTimeout(syncDebounce.current);
      syncDebounce.current = setTimeout(() => {
        send({
          type: 'workflow:sync',
          data: {
            nodes: nodes.map((n) => ({ id: n.id, type: n.type || '', data: n.data })),
            edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || undefined })),
          },
        });
      }, 500);
    },
    [send]
  );

  const activateWorkflow = useCallback(
    (workflowId: string, active: boolean) => {
      send({
        type: 'workflow:activate',
        data: { workflowId, active },
      });
    },
    [send]
  );

  return {
    triggerEvent,
    clearEvents,
    syncWorkflow,
    moveRobot,
    setSpeed,
    activateWorkflow,
    robots: store.robots,
    activeEvents: store.activeEvents,
    metrics: store.metrics,
    geminiResponses: store.geminiResponses,
    geminiThinking: store.geminiThinking,
    logs: store.logs,
    simulationSpeed: store.simulationSpeed,
    connected: store.connected,
    grid: store.grid,
    obstacles: store.obstacles,
    humanWorker: store.humanWorker,
  };
}
