import { useCallback } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { ClientWSMessage, EventType, RobotId, Position } from '../types';

export function useSimulation(send: (msg: ClientWSMessage) => void) {
  const store = useSimulationStore();

  const triggerEvent = useCallback(
    (type: EventType, location?: Position) => {
      store.setGeminiThinking(true);
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
