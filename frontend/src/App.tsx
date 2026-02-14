import { useWebSocket } from './hooks/useWebSocket';
import { useSimulation } from './hooks/useSimulation';
import { useSimulationStore } from './store/simulationStore';
import TopBar from './components/shared/TopBar';
import Dashboard from './components/Dashboard/Dashboard';
import WorkflowBuilder from './components/WorkflowBuilder/WorkflowBuilder';
import Analytics from './components/Analytics/Analytics';

export default function App() {
  const { send } = useWebSocket();
  const sim = useSimulation(send);
  const { activeTab, setActiveTab, wsLatency, activeWorkflows } = useSimulationStore();

  return (
    <div className="h-screen flex flex-col bg-rl-bg">
      {/* Top Bar */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connected={sim.connected}
        simulationSpeed={sim.simulationSpeed}
        onSpeedChange={sim.setSpeed}
        onTriggerEvent={sim.triggerEvent}
        metrics={sim.metrics}
        wsLatency={wsLatency}
      />

      {/* Main Content */}
      <main className="flex-1 p-3 min-h-0 overflow-hidden">
        {activeTab === 'dashboard' && (
          <Dashboard
            robots={sim.robots}
            logs={sim.logs}
            activeEvents={sim.activeEvents}
            humanWorker={sim.humanWorker}
            grid={sim.grid}
            obstacles={sim.obstacles}
            triggerEvent={sim.triggerEvent}
          />
        )}
        {activeTab === 'workflow' && <WorkflowBuilder />}
        {activeTab === 'analytics' && <Analytics metrics={sim.metrics} />}
      </main>

      {/* Bottom Bar */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-rl-border bg-rl-panel/50 text-[9px] text-gray-600">
        <div className="flex items-center gap-4">
          <span>
            Workflows active:{' '}
            <span className="text-rl-green">{activeWorkflows}</span>
          </span>
          <span>
            Last AI decision:{' '}
            <span className="text-rl-purple">
              {sim.geminiResponses.length > 0
                ? `${Math.round(
                    (Date.now() -
                      (sim.geminiResponses[sim.geminiResponses.length - 1]?.latency || 0)) /
                      1000
                  )}s ago`
                : 'None'}
            </span>
          </span>
          <span>
            WS Latency:{' '}
            <span className="text-rl-cyan">{wsLatency}ms</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Powered by</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
            Vultr
          </span>
        </div>
      </footer>
    </div>
  );
}
