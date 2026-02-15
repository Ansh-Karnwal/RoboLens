import { useState } from 'react';
import { GeminiResponse } from '../../types';

interface AIReasoningPanelProps {
  latestResponse: GeminiResponse | null;
  previousResponses: GeminiResponse[];
  isThinking: boolean;
}

export default function AIReasoningPanel({
  latestResponse,
  previousResponses,
  isThinking,
}: AIReasoningPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* AI Status */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-rl-purple animate-pulse" />
        <span className="text-[11px] text-rl-purple font-heading font-semibold">
          GEMINI 3.0 FLASH
        </span>
        {latestResponse?.latency && (
          <span className="text-[9px] text-gray-500 ml-auto">
            {latestResponse.latency}ms
          </span>
        )}
      </div>

      {/* Thinking indicator */}
      {isThinking && (
        <div className="panel p-3 mb-3 border-rl-purple/30">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-rl-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-rl-purple typing-cursor">
              AI Thinking
            </span>
          </div>
        </div>
      )}

      {/* Latest response */}
      {latestResponse && (
        <div className="panel p-3 mb-3 border-rl-purple/20">
          {latestResponse.fallback && (
            <div className="text-[9px] text-rl-orange bg-rl-orange/10 px-2 py-1 rounded mb-2">
              AI Unavailable — Using Fallback Logic
            </div>
          )}

          <div className="text-[11px] text-gray-300 mb-3 leading-relaxed">
            {latestResponse.reasoning}
          </div>

          {/* Assignments */}
          {latestResponse.assignments.length > 0 && (
            <div className="space-y-2 mb-2">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                Assignments
              </span>
              {latestResponse.assignments.map((a, i) => (
                <div
                  key={i}
                  className="bg-rl-bg/50 p-2 rounded border border-rl-border/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-rl-cyan">
                      {a.robotId}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rl-purple/20 text-rl-purple">
                      {a.taskType}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-400">
                    → ({a.targetLocation.x}, {a.targetLocation.y}) | Priority:{' '}
                    {a.priority}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1 italic">
                    {a.reason}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {latestResponse.alerts.length > 0 && (
            <div className="space-y-1">
              {latestResponse.alerts.map((alert, i) => (
                <div
                  key={i}
                  className="text-[9px] text-rl-orange bg-rl-orange/10 px-2 py-1 rounded"
                >
                  ⚠ {alert}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!latestResponse && !isThinking && (
        <div className="text-[10px] text-gray-600 italic text-center py-8">
          Trigger an event to see AI reasoning...
        </div>
      )}

      {/* Previous responses (accordion) */}
      {previousResponses.length > 0 && (
        <div className="space-y-1">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider">
            Previous Decisions
          </span>
          {previousResponses.slice(0, 5).map((resp, idx) => (
            <div key={idx} className="bg-rl-bg/30 rounded border border-rl-border/30">
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full text-left p-2 text-[9px] text-gray-400 hover:text-gray-300 transition-smooth flex justify-between items-center"
              >
                <span className="truncate">
                  {resp.assignments.map((a) => a.robotId).join(', ')} →{' '}
                  {resp.assignments.map((a) => a.taskType).join(', ')}
                </span>
                <span>{expandedIdx === idx ? '▼' : '▶'}</span>
              </button>
              {expandedIdx === idx && (
                <div className="px-2 pb-2 text-[9px] text-gray-500">
                  {resp.reasoning}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
