import { useState } from 'react';
import WarehouseCanvas from './WarehouseCanvas';
import RobotCard from './RobotCard';
import EventLog from './EventLog';
import AIReasoningPanel from './AIReasoningPanel';
import { useGemini } from '../../hooks/useGemini';
import { RobotData, EventLogEntry, SimulationEvent, HumanWorker, Position, TileType, EventType } from '../../types';

interface DashboardProps {
  robots: RobotData[];
  logs: EventLogEntry[];
  activeEvents: SimulationEvent[];
  humanWorker: HumanWorker | null;
  grid: TileType[][];
  obstacles: Position[];
  triggerEvent: (type: EventType) => void;
}

export default function Dashboard({
  robots,
  logs,
  activeEvents,
  humanWorker,
  grid,
  obstacles,
  triggerEvent,
}: DashboardProps) {
  const { latestResponse, previousResponses, isThinking } = useGemini();
  const [rightTab, setRightTab] = useState<'ai' | 'log'>('ai');

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* Left Sidebar — Robot Fleet */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
        <h3 className="font-heading font-semibold text-sm text-gray-400 uppercase tracking-wider mb-1">
          Robot Fleet
        </h3>
        {robots.map((robot) => (
          <RobotCard key={robot.id} robot={robot} />
        ))}

        {/* Quick event triggers */}
        <div className="panel p-3 mt-2">
          <h4 className="font-heading text-xs text-gray-500 uppercase mb-2">
            Quick Triggers
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { type: 'PACKAGE_DROP' as EventType, label: 'Package', icon: '📦' },
              { type: 'SPILL' as EventType, label: 'Spill', icon: '🟠' },
              { type: 'HUMAN_ENTRY' as EventType, label: 'Human', icon: '🚶' },
              { type: 'CONGESTION' as EventType, label: 'Congest', icon: '⚠' },
            ].map((ev) => (
              <button
                key={ev.type}
                onClick={() => triggerEvent(ev.type)}
                className="text-[10px] px-2 py-1.5 rounded border border-rl-border
                           hover:border-rl-cyan/50 hover:bg-rl-cyan/5 transition-smooth
                           text-gray-400 hover:text-rl-cyan"
              >
                {ev.icon} {ev.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center — Warehouse Canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <WarehouseCanvas
          robots={robots}
          grid={grid}
          obstacles={obstacles}
          humanWorker={humanWorker}
          activeEvents={activeEvents}
        />
      </div>

      {/* Right Sidebar — AI Reasoning + Event Log */}
      <div className="w-[320px] flex-shrink-0 flex flex-col min-h-0">
        {/* Tab Switcher */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setRightTab('ai')}
            className={`flex-1 text-[10px] py-1.5 rounded-t border-b-2 transition-smooth ${
              rightTab === 'ai'
                ? 'border-rl-purple text-rl-purple bg-rl-purple/5'
                : 'border-transparent text-gray-500 hover:text-gray-400'
            }`}
          >
            AI Reasoning
          </button>
          <button
            onClick={() => setRightTab('log')}
            className={`flex-1 text-[10px] py-1.5 rounded-t border-b-2 transition-smooth ${
              rightTab === 'log'
                ? 'border-rl-cyan text-rl-cyan bg-rl-cyan/5'
                : 'border-transparent text-gray-500 hover:text-gray-400'
            }`}
          >
            Event Log
          </button>
        </div>

        {/* Tab Content */}
        <div className="panel p-3 flex-1 overflow-hidden">
          {rightTab === 'ai' ? (
            <AIReasoningPanel
              latestResponse={latestResponse}
              previousResponses={previousResponses}
              isThinking={isThinking}
            />
          ) : (
            <EventLog logs={logs} />
          )}
        </div>
      </div>
    </div>
  );
}
