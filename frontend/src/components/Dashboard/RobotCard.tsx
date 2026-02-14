import { RobotData, RobotState } from '../../types';

interface RobotCardProps {
  robot: RobotData;
}

const STATE_BADGES: Record<RobotState, { label: string; color: string; className: string }> = {
  IDLE: { label: 'IDLE', color: '#00d4ff', className: 'glow-cyan' },
  MOVING: { label: 'MOVING', color: '#00d4ff', className: '' },
  WORKING: { label: 'WORKING', color: '#a855f7', className: 'glow-purple' },
  PAUSED: { label: 'PAUSED', color: '#ffcc00', className: 'flash-yellow' },
  CHARGING: { label: 'CHARGING', color: '#00ff88', className: 'glow-green' },
};

export default function RobotCard({ robot }: RobotCardProps) {
  const badge = STATE_BADGES[robot.state];
  const batteryColor =
    robot.battery > 50 ? '#00ff88' : robot.battery > 20 ? '#ffcc00' : '#ff4444';

  return (
    <div className="panel p-3 transition-smooth hover:border-rl-cyan/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: robot.color }}
          />
          <span className="font-heading font-semibold text-lg">{robot.id}</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${badge.className}`}
          style={{
            backgroundColor: badge.color + '20',
            color: badge.color,
            border: `1px solid ${badge.color}40`,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Battery bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Battery</span>
          <span style={{ color: batteryColor }}>{Math.round(robot.battery)}%</span>
        </div>
        <div className="h-1.5 bg-rl-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${robot.battery}%`,
              backgroundColor: batteryColor,
              boxShadow: `0 0 6px ${batteryColor}60`,
            }}
          />
        </div>
      </div>

      {/* Current task */}
      <div className="text-[10px] text-gray-400 mb-1">
        {robot.currentTask ? (
          <div className="truncate">
            <span className="text-white">{robot.currentTask.type}</span>
            {' — '}
            {robot.currentTask.description}
          </div>
        ) : (
          <span className="italic">No active task</span>
        )}
      </div>

      {/* Position + queue */}
      <div className="flex justify-between text-[9px] text-gray-500">
        <span>
          ({robot.position.x}, {robot.position.y})
        </span>
        {robot.taskQueue.length > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-rl-border text-gray-400">
            Queue: {robot.taskQueue.length}
          </span>
        )}
      </div>
    </div>
  );
}
