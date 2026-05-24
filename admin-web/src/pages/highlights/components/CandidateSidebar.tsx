import type { HighlightReviewContext } from '../../../shared/types';

interface Props {
  neighbors: HighlightReviewContext['candidateNeighbors'];
  currentId: string;
  onSelect: (id: string) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const TYPE_LABELS: Record<string, string> = {
  feel_good: '爽点',
  reversal: '反转',
  conflict: '冲突',
  sweet: '甜蜜',
  suspense: '悬念',
};

export function CandidateSidebar({ neighbors, currentId, onSelect }: Props) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
        候选列表 ({neighbors.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {neighbors.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">暂无其他候选</div>
        ) : (
          neighbors.map((n) => (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${
                n.id === currentId ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-800 truncate">
                {n.title || '(无标题)'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {TYPE_LABELS[n.type] || n.type}
                </span>
                <span className="text-xs text-gray-400 tabular-nums">
                  {formatTime(n.startTimeMs)} ~ {formatTime(n.endTimeMs)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
