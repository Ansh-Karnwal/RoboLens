import { useState } from 'react';
import { EventLogEntry } from '../../types';

interface EventLogProps {
  logs: EventLogEntry[];
}

const FILTER_TYPES = [
  { key: 'ALL', label: 'All' },
  { key: 'PACKAGE_DROP', label: 'Package' },
  { key: 'SPILL', label: 'Spill' },
  { key: 'HUMAN_ENTRY', label: 'Human' },
  { key: 'TASK_ASSIGNED', label: 'Assigned' },
  { key: 'TASK_COMPLETED', label: 'Done' },
  { key: 'SAFETY_ALERT', label: 'Alert' },
];

export default function EventLog({ logs }: EventLogProps) {
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' ? logs : logs.filter((l) => l.type === filter);
  const display = filtered.slice(-30).reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-1 mb-2">
        {FILTER_TYPES.map((ft) => (
          <button
            key={ft.key}
            onClick={() => setFilter(ft.key)}
            className={`text-[9px] px-2 py-0.5 rounded border transition-smooth ${
              filter === ft.key
                ? 'border-rl-cyan text-rl-cyan bg-rl-cyan/10'
                : 'border-rl-border text-gray-500 hover:border-gray-500'
            }`}
          >
            {ft.label}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {display.length === 0 && (
          <p className="text-[10px] text-gray-600 italic text-center py-4">
            No events yet...
          </p>
        )}
        {display.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 text-[10px] py-1 px-2 rounded bg-rl-bg/50 hover:bg-rl-border/30 transition-smooth"
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: log.color }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-gray-300 break-words">{log.message}</span>
            </div>
            <span className="text-gray-600 flex-shrink-0 tabular-nums">
              {new Date(log.timestamp).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
