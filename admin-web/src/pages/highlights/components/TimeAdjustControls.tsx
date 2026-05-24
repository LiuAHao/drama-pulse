import { useEffect, useState } from 'react';

interface Props {
  startTimeMs: number;
  endTimeMs: number;
  interactionStartMs: number;
  interactionAppearMs: number;
  interactionEndMs: number;
  onStartTimeChange: (ms: number) => void;
  onEndTimeChange: (ms: number) => void;
  onInteractionStartTimeChange: (ms: number) => void;
  onInteractionAppearTimeChange: (ms: number) => void;
  onInteractionEndTimeChange: (ms: number) => void;
}

function formatTimeInput(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const msRemainder = ms % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(msRemainder).padStart(3, '0')}`;
}

function parseTimeInput(value: string): number | null {
  // Try mm:ss.mmm format
  const match = value.match(/^(\d+):(\d{2})\.(\d{3})$/);
  if (match) {
    return parseInt(match[1]) * 60000 + parseInt(match[2]) * 1000 + parseInt(match[3]);
  }
  // Try plain number
  const num = parseInt(value);
  if (!isNaN(num) && num >= 0) return num;
  return null;
}

const ADJUST_STEPS = [
  { label: '-1s', delta: -1000 },
  { label: '-500ms', delta: -500 },
  { label: '+500ms', delta: 500 },
  { label: '+1s', delta: 1000 },
];

export function TimeAdjustControls({
  startTimeMs,
  endTimeMs,
  interactionStartMs,
  interactionAppearMs,
  interactionEndMs,
  onStartTimeChange,
  onEndTimeChange,
  onInteractionStartTimeChange,
  onInteractionAppearTimeChange,
  onInteractionEndTimeChange,
}: Props) {
  const [startInput, setStartInput] = useState(formatTimeInput(startTimeMs));
  const [endInput, setEndInput] = useState(formatTimeInput(endTimeMs));
  const [interactionStartInput, setInteractionStartInput] = useState(formatTimeInput(interactionStartMs));
  const [interactionAppearInput, setInteractionAppearInput] = useState(formatTimeInput(interactionAppearMs));
  const [interactionEndInput, setInteractionEndInput] = useState(formatTimeInput(interactionEndMs));

  useEffect(() => {
    setStartInput(formatTimeInput(startTimeMs));
  }, [startTimeMs]);

  useEffect(() => {
    setEndInput(formatTimeInput(endTimeMs));
  }, [endTimeMs]);

  useEffect(() => {
    setInteractionStartInput(formatTimeInput(interactionStartMs));
  }, [interactionStartMs]);

  useEffect(() => {
    setInteractionAppearInput(formatTimeInput(interactionAppearMs));
  }, [interactionAppearMs]);

  useEffect(() => {
    setInteractionEndInput(formatTimeInput(interactionEndMs));
  }, [interactionEndMs]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 w-16 shrink-0">开始时间</label>
        <input
          type="text"
          value={startInput}
          onChange={(e) => setStartInput(e.target.value)}
          onBlur={(e) => {
            const ms = parseTimeInput(e.target.value);
            if (ms !== null && ms >= 0) {
              onStartTimeChange(ms);
            } else {
              setStartInput(formatTimeInput(startTimeMs));
            }
          }}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-[10px] text-gray-400 tabular-nums w-16">{startTimeMs}ms</span>
      </div>
      <div className="flex gap-1 pl-16">
        {ADJUST_STEPS.map((step) => (
          <button
            key={`start-${step.label}`}
            onClick={() => onStartTimeChange(Math.max(0, startTimeMs + step.delta))}
            className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 w-16 shrink-0">结束时间</label>
        <input
          type="text"
          value={endInput}
          onChange={(e) => setEndInput(e.target.value)}
          onBlur={(e) => {
            const ms = parseTimeInput(e.target.value);
            if (ms !== null && ms > startTimeMs) {
              onEndTimeChange(ms);
            } else {
              setEndInput(formatTimeInput(endTimeMs));
            }
          }}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-[10px] text-gray-400 tabular-nums w-16">{endTimeMs}ms</span>
      </div>
      <div className="flex gap-1 pl-16">
        {ADJUST_STEPS.map((step) => (
          <button
            key={`end-${step.label}`}
            onClick={() => onEndTimeChange(Math.max(startTimeMs + 1000, endTimeMs + step.delta))}
            className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="text-[10px] text-gray-400 pl-16">
        时长: {((endTimeMs - startTimeMs) / 1000).toFixed(1)}s
        {endTimeMs - startTimeMs > 20000 && (
          <span className="text-orange-500 ml-2">⚠ 超过 20 秒</span>
        )}
      </div>

      <div className="pt-2 border-t border-gray-100 space-y-2">
        <div className="text-[10px] text-gray-400 pl-16">交互窗口与露出时间</div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-16 shrink-0">窗口开始</label>
          <input
            type="text"
            value={interactionStartInput}
            onChange={(e) => setInteractionStartInput(e.target.value)}
            onBlur={(e) => {
              const ms = parseTimeInput(e.target.value);
              if (ms !== null && ms >= 0 && ms <= interactionAppearMs) {
                onInteractionStartTimeChange(ms);
              } else {
                setInteractionStartInput(formatTimeInput(interactionStartMs));
              }
            }}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-400 tabular-nums w-16">{interactionStartMs}ms</span>
        </div>
        <div className="flex gap-1 pl-16">
          {ADJUST_STEPS.map((step) => (
            <button
              key={`interaction-start-${step.label}`}
              onClick={() => onInteractionStartTimeChange(Math.max(0, Math.min(interactionAppearMs, interactionStartMs + step.delta)))}
              className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
            >
              {step.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-16 shrink-0">真正出现</label>
          <input
            type="text"
            value={interactionAppearInput}
            onChange={(e) => setInteractionAppearInput(e.target.value)}
            onBlur={(e) => {
              const ms = parseTimeInput(e.target.value);
              if (ms !== null && ms >= interactionStartMs && ms < interactionEndMs) {
                onInteractionAppearTimeChange(ms);
              } else {
                setInteractionAppearInput(formatTimeInput(interactionAppearMs));
              }
            }}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-400 tabular-nums w-16">{interactionAppearMs}ms</span>
        </div>
        <div className="flex gap-1 pl-16">
          {ADJUST_STEPS.map((step) => (
            <button
              key={`interaction-appear-${step.label}`}
              onClick={() => onInteractionAppearTimeChange(Math.max(interactionStartMs, Math.min(interactionEndMs - 1, interactionAppearMs + step.delta)))}
              className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
            >
              {step.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-16 shrink-0">窗口结束</label>
          <input
            type="text"
            value={interactionEndInput}
            onChange={(e) => setInteractionEndInput(e.target.value)}
            onBlur={(e) => {
              const ms = parseTimeInput(e.target.value);
              if (ms !== null && ms > interactionAppearMs) {
                onInteractionEndTimeChange(ms);
              } else {
                setInteractionEndInput(formatTimeInput(interactionEndMs));
              }
            }}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-400 tabular-nums w-16">{interactionEndMs}ms</span>
        </div>
        <div className="flex gap-1 pl-16">
          {ADJUST_STEPS.map((step) => (
            <button
              key={`interaction-end-${step.label}`}
              onClick={() => onInteractionEndTimeChange(Math.max(interactionAppearMs + 1, interactionEndMs + step.delta))}
              className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
