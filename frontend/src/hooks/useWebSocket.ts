import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { ClientWSMessage, ServerWSMessage } from '../types';
import { defaultNodes, defaultEdges } from '../components/WorkflowBuilder/defaultWorkflows';

const WS_URL = import.meta.env?.VITE_BACKEND_WS_URL || 'ws://localhost:3001';
const API_URL = import.meta.env?.VITE_BACKEND_API_URL || 'http://localhost:3001';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setConnected = useSimulationStore((s) => s.setConnected);
  const setWsLatency = useSimulationStore((s) => s.setWsLatency);
  const updateRobot = useSimulationStore((s) => s.updateRobot);
  const addEvent = useSimulationStore((s) => s.addEvent);
  const addGeminiResponse = useSimulationStore((s) => s.addGeminiResponse);
  const updateMetrics = useSimulationStore((s) => s.updateMetrics);
  const addLog = useSimulationStore((s) => s.addLog);
  const setFullState = useSimulationStore((s) => s.setFullState);
  const clearEvents = useSimulationStore((s) => s.clearEvents);
  const setGeminiThinking = useSimulationStore((s) => s.setGeminiThinking);
  const connected = useSimulationStore((s) => s.connected);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected to backend');

      fetch(`${API_URL}/api/state`)
        .then((r) => r.json())
        .then((state) => {
          setFullState(state);
        })
        .catch(console.error);

      // Sync default workflows to backend on connect
      ws.send(JSON.stringify({
        type: 'workflow:sync',
        data: {
          nodes: defaultNodes.map((n) => ({ id: n.id, type: n.type || '', data: n.data })),
          edges: defaultEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: (e as any).sourceHandle || undefined })),
        },
      }));
    };

    ws.onmessage = (event) => {
      const pingTime = Date.now();
      try {
        const msg = JSON.parse(event.data) as ServerWSMessage;
        setWsLatency(Date.now() - pingTime);

        switch (msg.type) {
          case 'robot:update':
            updateRobot(msg.data);
            break;
          case 'event:new':
            addEvent(msg.data);
            break;
          case 'gemini:response':
            addGeminiResponse(msg.data);
            break;
          case 'metrics:update':
            updateMetrics(msg.data);
            break;
          case 'task:assigned':
            addLog({
              id: `ta-${Date.now()}`,
              type: 'TASK_ASSIGNED',
              message: `${msg.data.robotId} assigned ${msg.data.taskType} at (${msg.data.location.x}, ${msg.data.location.y})`,
              timestamp: Date.now(),
              color: '#00d4ff',
            });
            break;
          case 'task:completed':
            addLog({
              id: `tc-${Date.now()}`,
              type: 'TASK_COMPLETED',
              message: `${msg.data.robotId} completed task (${Math.round(msg.data.duration / 1000)}s)`,
              timestamp: Date.now(),
              color: '#00ff88',
            });
            break;
          case 'alert:safety':
            addLog({
              id: `sa-${Date.now()}`,
              type: 'SAFETY_ALERT',
              message: msg.data.message,
              timestamp: Date.now(),
              color: '#ff6b35',
            });
            break;
          case 'workflow:action':
            addLog({
              id: `wf-${Date.now()}`,
              type: 'GEMINI_DECISION',
              message: msg.data.message,
              timestamp: Date.now(),
              color: '#a855f7',
            });
            break;
          case 'gemini:skipped':
            setGeminiThinking(false);
            break;
          case 'events:cleared':
            clearEvents();
            break;
          case 'state:full':
            setFullState(msg.data);
            break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected — reconnecting in 3s');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [setConnected, setWsLatency, updateRobot, addEvent, addGeminiResponse, updateMetrics, addLog, setFullState, clearEvents, setGeminiThinking]);

  const send = useCallback((msg: ClientWSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { send, connected };
}
