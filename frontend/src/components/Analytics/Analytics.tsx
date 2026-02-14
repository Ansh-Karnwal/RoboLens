import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { SimulationMetrics } from '../../types';

interface AnalyticsProps {
  metrics: SimulationMetrics;
}

const ROBOT_COLORS: Record<string, string> = {
  R1: '#00d4ff',
  R2: '#ff6b35',
  R3: '#a855f7',
  R4: '#00ff88',
};

const TASK_COLORS: Record<string, string> = {
  PICKUP: '#00d4ff',
  CLEAN: '#ff6b35',
  ESCORT: '#ffcc00',
  RECHARGE: '#00ff88',
  STANDBY: '#a855f7',
};

export default function Analytics({ metrics }: AnalyticsProps) {
  // Task history chart data
  const historyData = metrics.taskHistory.map((entry) => ({
    time: new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }),
    tasks: entry.tasksCompleted,
  }));

  // Robot utilization data
  const utilizationData = Object.entries(metrics.robotUtilization).map(([id, util]) => ({
    robot: id,
    utilization: util,
    fill: ROBOT_COLORS[id] || '#666',
  }));

  // Task distribution data
  const distributionData = Object.entries(metrics.taskTypeDistribution)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
      fill: TASK_COLORS[type] || '#666',
    }));

  const tooltipStyle = {
    contentStyle: {
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '6px',
      fontSize: '11px',
      fontFamily: '"Space Mono", monospace',
      color: '#e2e8f0',
    },
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Total Tasks',
            value: metrics.tasksCompleted,
            color: '#00d4ff',
          },
          {
            label: 'Avg Completion',
            value: `${(metrics.avgResponseTime / 1000).toFixed(1)}s`,
            color: '#00ff88',
          },
          {
            label: 'Human Interventions Avoided',
            value: Math.max(0, metrics.tasksCompleted - 2),
            color: '#a855f7',
          },
          {
            label: 'Efficiency Score',
            value: `${metrics.efficiency}%`,
            color: '#ffcc00',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="panel p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {kpi.label}
            </div>
            <div
              className="text-2xl font-heading font-bold"
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tasks Completed Over Time */}
        <div className="panel p-4">
          <h3 className="font-heading font-semibold text-sm text-gray-300 mb-3">
            Tasks Completed Over Time
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 9 }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 9 }} />
              <Tooltip {...tooltipStyle} />
              <Line
                type="monotone"
                dataKey="tasks"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#00d4ff' }}
              />
            </LineChart>
          </ResponsiveContainer>
          {historyData.length === 0 && (
            <div className="text-center text-[10px] text-gray-600 py-8">
              Data will appear as tasks are completed...
            </div>
          )}
        </div>

        {/* Robot Utilization */}
        <div className="panel p-4">
          <h3 className="font-heading font-semibold text-sm text-gray-300 mb-3">
            Robot Utilization %
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="robot" stroke="#4b5563" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                {utilizationData.map((entry) => (
                  <Cell key={entry.robot} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Task Type Distribution */}
        <div className="panel p-4">
          <h3 className="font-heading font-semibold text-sm text-gray-300 mb-3">
            Task Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {distributionData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: '10px', fontFamily: '"Space Mono", monospace' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {distributionData.length === 0 && (
            <div className="text-center text-[10px] text-gray-600 py-8">
              No tasks completed yet...
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="panel p-4">
          <h3 className="font-heading font-semibold text-sm text-gray-300 mb-3">
            System Health
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Task Throughput</span>
                <span className="text-rl-cyan">{metrics.tasksCompleted} completed</span>
              </div>
              <div className="h-2 bg-rl-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-rl-cyan transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.tasksCompleted * 2)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Response Time</span>
                <span className="text-rl-green">
                  {(metrics.avgResponseTime / 1000).toFixed(1)}s avg
                </span>
              </div>
              <div className="h-2 bg-rl-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-rl-green transition-all duration-500"
                  style={{
                    width: `${Math.max(5, 100 - metrics.avgResponseTime / 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Fleet Efficiency</span>
                <span className="text-rl-purple">{metrics.efficiency}%</span>
              </div>
              <div className="h-2 bg-rl-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-rl-purple transition-all duration-500"
                  style={{ width: `${metrics.efficiency}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
