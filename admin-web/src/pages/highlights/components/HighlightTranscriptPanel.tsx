import type { TranscriptSegment } from '../../../shared/types';

interface Props {
  segments: TranscriptSegment[];
  supportingSegmentIds: string[];
  startTimeMs: number;
  endTimeMs: number;
  currentTimeMs: number;
  transcriptAvailable: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function HighlightTranscriptPanel({
  segments,
  supportingSegmentIds,
  startTimeMs,
  endTimeMs,
  currentTimeMs,
  transcriptAvailable,
}: Props) {
  if (!transcriptAvailable) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        暂无 transcript 上下文
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        候选时间范围内无 transcript 片段
      </div>
    );
  }

  const supportingSet = new Set(supportingSegmentIds);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
        Transcript 上下文 ({segments.length} 条)
      </div>
      <div className="divide-y divide-gray-50">
        {segments.map((seg) => {
          const isSupporting = supportingSet.has(seg.segmentId);
          const isInHighlight = seg.endTimeMs >= startTimeMs && seg.startTimeMs <= endTimeMs;
          const isCurrentPlay = currentTimeMs >= seg.startTimeMs && currentTimeMs <= seg.endTimeMs;

          let bgClass = '';
          if (isSupporting) bgClass = 'bg-yellow-50 border-l-2 border-l-yellow-400';
          else if (isInHighlight) bgClass = 'bg-blue-50/50';
          if (isCurrentPlay) bgClass += ' ring-1 ring-blue-300';

          return (
            <div
              key={seg.segmentId}
              className={`px-3 py-1.5 text-sm ${bgClass}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] text-gray-400 font-mono w-16 shrink-0">
                  {seg.segmentId}
                </span>
                <span className="text-[10px] text-gray-400 tabular-nums w-20 shrink-0">
                  {formatTime(seg.startTimeMs)} ~ {formatTime(seg.endTimeMs)}
                </span>
                <span className="text-gray-800">{seg.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
