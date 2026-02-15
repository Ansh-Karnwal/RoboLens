import { useState } from 'react';
import Navigation from './Navigation';
import StatusBadge from './StatusBadge';
import { TabView, SimulationMetrics, EventType } from '../../types';

interface TopBarProps {
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
  connected: boolean;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
  onTriggerEvent: (type: EventType) => void;
  onClearEvents: () => void;
  metrics: SimulationMetrics;
  wsLatency: number;
}

export default function TopBar({
  activeTab,
  onTabChange,
  connected,
  simulationSpeed,
  onSpeedChange,
  onTriggerEvent,
  onClearEvents,
  metrics,
  wsLatency,
}: TopBarProps) {
  const [showEventMenu, setShowEventMenu] = useState(false);

  const speeds = [0.5, 1, 2, 4];

  const eventTypes: { type: EventType; label: string }[] = [
    { type: 'PACKAGE_DROP', label: 'Package Drop' },
    { type: 'SPILL', label: 'Spill' },
    { type: 'HUMAN_ENTRY', label: 'Human Entry' },
    { type: 'CONGESTION', label: 'Congestion' },
  ];

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-rl-border bg-rl-panel/80 backdrop-blur-sm">
      {/* Logo + Navigation */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rl-cyan to-rl-purple flex items-center justify-center text-sm font-bold text-rl-bg">
            RL
          </div>
          <div>
            <h1 className="font-heading font-bold text-base leading-none text-white">
              RoboLens
            </h1>
            <p className="text-[8px] text-gray-500 leading-none">
              Vision-Guided Coordination
            </p>
          </div>
        </div>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      {/* Controls + Status */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <StatusBadge connected={connected} />

        {/* Simulation speed */}
        <div className="flex items-center gap-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`text-[9px] px-2 py-1 rounded border transition-smooth ${
                simulationSpeed === s
                  ? 'border-rl-cyan text-rl-cyan bg-rl-cyan/10'
                  : 'border-rl-border text-gray-500 hover:border-gray-500'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Trigger Event dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowEventMenu(!showEventMenu)}
            className="text-[10px] px-3 py-1.5 rounded border border-rl-orange/50 text-rl-orange
                       hover:bg-rl-orange/10 transition-smooth"
          >
            Trigger Event ▾
          </button>
          {showEventMenu && (
            <div className="absolute right-0 mt-1 w-40 panel p-1 z-50 shadow-lg">
              {eventTypes.map((ev) => (
                <button
                  key={ev.type}
                  onClick={() => {
                    onTriggerEvent(ev.type);
                    setShowEventMenu(false);
                  }}
                  className="w-full text-left text-[10px] px-3 py-1.5 rounded
                             text-gray-400 hover:text-white hover:bg-rl-border/50 transition-smooth"
                >
                  {ev.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Events */}
        <button
          onClick={onClearEvents}
          className="text-[10px] px-3 py-1.5 rounded border border-red-500/50 text-red-400
                     hover:bg-red-500/10 transition-smooth"
        >
          Clear Events
        </button>

        {/* KPI pills */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="text-[9px] px-2 py-1 rounded bg-rl-cyan/10 text-rl-cyan border border-rl-cyan/20">
            Tasks: {metrics.tasksCompleted}
          </span>
          <span className="text-[9px] px-2 py-1 rounded bg-rl-green/10 text-rl-green border border-rl-green/20">
            Avg: {(metrics.avgResponseTime / 1000).toFixed(1)}s
          </span>
          <span className="text-[9px] px-2 py-1 rounded bg-rl-purple/10 text-rl-purple border border-rl-purple/20">
            Eff: {metrics.efficiency}%
          </span>
        </div>
      </div>
    </header>
  );
}
