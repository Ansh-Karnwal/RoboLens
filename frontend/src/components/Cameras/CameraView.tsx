import { useState } from 'react';
import CameraFeed from './CameraFeed';
import { RobotData, SimulationEvent, HumanWorker, Position, TileType } from '../../types';

interface CameraViewProps {
  robots: RobotData[];
  activeEvents: SimulationEvent[];
  humanWorker: HumanWorker | null;
  grid: TileType[][];
  obstacles: Position[];
}

export default function CameraView({
  robots,
  activeEvents,
  humanWorker,
  grid,
  obstacles,
}: CameraViewProps) {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [pipelineActive] = useState(true);

  const selectedRobot = selectedFeed ? robots.find(r => r.id === selectedFeed) : null;

  // Compute detection stats
  const totalDetections = robots.length + activeEvents.length + (humanWorker?.active ? 1 : 0);
  const robotDetections = robots.filter(r => r.state !== 'IDLE').length;

  return (
    <div className="h-full flex gap-3">
      {/* Camera Feeds */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Grid / Expanded view */}
        {selectedRobot ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRobot.color }} />
                <span className="font-heading font-semibold text-sm">
                  CAM-{selectedRobot.id} — EXPANDED VIEW
                </span>
              </div>
              <button
                onClick={() => setSelectedFeed(null)}
                className="text-[10px] px-3 py-1 rounded border border-rl-border text-gray-400
                           hover:border-rl-cyan hover:text-rl-cyan transition-smooth"
              >
                Grid View
              </button>
            </div>
            <div className="flex-1 panel overflow-hidden flex items-center justify-center">
              <CameraFeed
                robot={selectedRobot}
                allRobots={robots}
                activeEvents={activeEvents}
                humanWorker={humanWorker}
                grid={grid}
                obstacles={obstacles}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
            {robots.map((robot) => (
              <div
                key={robot.id}
                className="panel p-1 cursor-pointer hover:border-rl-cyan/50 transition-smooth relative overflow-hidden"
                onClick={() => setSelectedFeed(robot.id)}
              >
                <CameraFeed
                  robot={robot}
                  allRobots={robots}
                  activeEvents={activeEvents}
                  humanWorker={humanWorker}
                  grid={grid}
                  obstacles={obstacles}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-rl-cyan/0 hover:bg-rl-cyan/5 transition-smooth flex items-center justify-center opacity-0 hover:opacity-100">
                  <span className="text-[10px] text-rl-cyan bg-rl-bg/80 px-2 py-1 rounded">
                    Click to expand
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vision Processing Panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
        {/* Pipeline Status */}
        <div className="panel p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${pipelineActive ? 'bg-rl-green animate-pulse' : 'bg-red-500'}`} />
            <span className="font-heading font-semibold text-xs text-white uppercase tracking-wider">
              Vision Pipeline
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Model</span>
              <span className="text-rl-green">YOLOv8-Warehouse</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Inference</span>
              <span className="text-rl-cyan">12.4ms</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Frame Rate</span>
              <span className="text-rl-cyan">30 FPS</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Resolution</span>
              <span className="text-gray-400">384x288 per feed</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Mode</span>
              <span className="text-rl-green">IR Night Vision</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Active Cameras</span>
              <span className="text-white">{robots.length}/4</span>
            </div>
          </div>
        </div>

        {/* Detection Summary */}
        <div className="panel p-3">
          <h4 className="font-heading text-xs text-gray-400 uppercase tracking-wider mb-2">
            Live Detections
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-rl-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rl-cyan" />
                <span className="text-gray-300">Robots</span>
              </div>
              <span className="text-rl-cyan font-semibold">{robots.length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-rl-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rl-orange" />
                <span className="text-gray-300">Events/Objects</span>
              </div>
              <span className="text-rl-orange font-semibold">{activeEvents.length}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-rl-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rl-yellow" />
                <span className="text-gray-300">Human Workers</span>
              </div>
              <span className="text-rl-yellow font-semibold">{humanWorker?.active ? 1 : 0}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-rl-bg/50 border border-rl-border">
              <span className="text-gray-300">Total Objects</span>
              <span className="text-white font-semibold">{totalDetections}</span>
            </div>
          </div>
        </div>

        {/* Per-Robot Status */}
        <div className="panel p-3">
          <h4 className="font-heading text-xs text-gray-400 uppercase tracking-wider mb-2">
            Camera Status
          </h4>
          <div className="space-y-1.5">
            {robots.map((robot) => (
              <button
                key={robot.id}
                onClick={() => setSelectedFeed(selectedFeed === robot.id ? null : robot.id)}
                className={`w-full flex items-center justify-between text-[10px] py-1.5 px-2 rounded
                  transition-smooth border ${
                    selectedFeed === robot.id
                      ? 'border-rl-cyan/50 bg-rl-cyan/5'
                      : 'border-transparent hover:border-rl-border bg-rl-bg/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: robot.color }} />
                  <span className="text-gray-300">CAM-{robot.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                    robot.state === 'MOVING' ? 'bg-rl-cyan/10 text-rl-cyan' :
                    robot.state === 'WORKING' ? 'bg-rl-purple/10 text-rl-purple' :
                    robot.state === 'CHARGING' ? 'bg-rl-green/10 text-rl-green' :
                    robot.state === 'PAUSED' ? 'bg-rl-yellow/10 text-rl-yellow' :
                    'bg-rl-border text-gray-500'
                  }`}>
                    {robot.state}
                  </span>
                  <span className="text-rl-green">LIVE</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detection Classes */}
        <div className="panel p-3">
          <h4 className="font-heading text-xs text-gray-400 uppercase tracking-wider mb-2">
            Detection Classes
          </h4>
          <div className="space-y-1 text-[9px]">
            {[
              { cls: 'ROBOT', conf: '97.2', color: '#00ff00', count: robots.length },
              { cls: 'PACKAGE', conf: '94.1', color: '#00d4ff', count: activeEvents.filter(e => e.type === 'PACKAGE_DROP').length },
              { cls: 'HAZARD_SPILL', conf: '91.8', color: '#ff6b35', count: activeEvents.filter(e => e.type === 'SPILL').length },
              { cls: 'HUMAN_WORKER', conf: '98.6', color: '#ffcc00', count: humanWorker?.active ? 1 : 0 },
              { cls: 'OBSTACLE', conf: '99.4', color: '#666', count: obstacles.length },
            ].map((d) => (
              <div key={d.cls} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400">{d.cls}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">avg {d.conf}%</span>
                  <span className="text-white w-4 text-right">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
