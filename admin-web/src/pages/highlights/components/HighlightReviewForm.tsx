import type { Highlight } from '../../../shared/types';
import { TimeAdjustControls } from './TimeAdjustControls';

const TYPE_OPTIONS = [
  { value: 'feel_good', label: 'feel_good (爽点)' },
  { value: 'reversal', label: 'reversal (反转)' },
  { value: 'conflict', label: 'conflict (冲突)' },
  { value: 'sweet', label: 'sweet (甜蜜)' },
  { value: 'suspense', label: 'suspense (悬念)' },
];

const TEMPLATE_OPTIONS = [
  { value: 'emotion_button', label: 'emotion_button' },
  { value: 'vote_side', label: 'vote_side' },
  { value: 'suspense_lock', label: 'suspense_lock' },
];

export interface ReviewFormState {
  startTimeMs: number;
  endTimeMs: number;
  interactionStartMs: number;
  interactionAppearMs: number;
  interactionEndMs: number;
  type: string;
  title: string;
  description: string;
  templateId: string;
  interactionOptions: string[];
  intensity: number;
  confidence: number;
  reason: string;
  supportingSegmentIds: string[];
  speakerGuess: string;
  targetCharacterGuess: string;
  mentionedCharacters: string[];
  characterGuessConfidence: number | null;
}

interface Props {
  form: ReviewFormState;
  onChange: (patch: Partial<ReviewFormState>) => void;
}

export function buildFormFromHighlight(h: Highlight): ReviewFormState {
  let interactionOptions: string[] = [];
  try { interactionOptions = JSON.parse(h.interactionOptionsJson); } catch { /* empty */ }
  let supportingSegmentIds: string[] = [];
  try { supportingSegmentIds = JSON.parse(h.supportingSegmentIdsJson); } catch { /* empty */ }
  let mentionedCharacters: string[] = [];
  try { mentionedCharacters = JSON.parse(h.mentionedCharactersJson); } catch { /* empty */ }

  return {
    startTimeMs: h.startTimeMs,
    endTimeMs: h.endTimeMs,
    interactionStartMs: h.interactionStartMs,
    interactionAppearMs: h.interactionAppearMs,
    interactionEndMs: h.interactionEndMs,
    type: h.type,
    title: h.title,
    description: h.description,
    templateId: h.templateId,
    interactionOptions,
    intensity: h.intensity,
    confidence: h.confidence,
    reason: h.reason,
    supportingSegmentIds,
    speakerGuess: h.speakerGuess,
    targetCharacterGuess: h.targetCharacterGuess,
    mentionedCharacters,
    characterGuessConfidence: h.characterGuessConfidence,
  };
}

export function HighlightReviewForm({ form, onChange }: Props) {
  return (
    <div className="h-full overflow-y-auto px-3 py-3 space-y-4 text-sm">
      {/* Time adjust */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">时间修正</h4>
        <TimeAdjustControls
          startTimeMs={form.startTimeMs}
          endTimeMs={form.endTimeMs}
          interactionStartMs={form.interactionStartMs}
          interactionAppearMs={form.interactionAppearMs}
          interactionEndMs={form.interactionEndMs}
          onStartTimeChange={(ms) => onChange({ startTimeMs: ms })}
          onEndTimeChange={(ms) => onChange({ endTimeMs: ms })}
          onInteractionStartTimeChange={(ms) => onChange({ interactionStartMs: ms })}
          onInteractionAppearTimeChange={(ms) => onChange({ interactionAppearMs: ms })}
          onInteractionEndTimeChange={(ms) => onChange({ interactionEndMs: ms })}
        />
      </section>

      {/* Type + Template */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">类型与模板</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">类型</label>
            <select
              value={form.type}
              onChange={(e) => onChange({ type: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">模板</label>
            <select
              value={form.templateId}
              onChange={(e) => onChange({ templateId: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TEMPLATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Title + Description */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">文案</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Interaction options */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">互动选项</h4>
        <div className="flex flex-wrap gap-1 mb-1">
          {form.interactionOptions.map((opt, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
            >
              {opt}
              <button
                onClick={() => onChange({ interactionOptions: form.interactionOptions.filter((_, j) => j !== i) })}
                className="text-blue-400 hover:text-blue-600 cursor-pointer"
              >
                x
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="输入选项后回车添加"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onChange({ interactionOptions: [...form.interactionOptions, e.currentTarget.value.trim()] });
              e.currentTarget.value = '';
            }
          }}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </section>

      {/* Intensity + Confidence */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">强度与置信度</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">强度 (1-5)</label>
            <select
              value={form.intensity}
              onChange={(e) => onChange({ intensity: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">置信度</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.confidence}
              onChange={(e) => onChange({ confidence: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Character guess fields */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">角色推断 (可选)</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">说话人</label>
              <input
                type="text"
                value={form.speakerGuess}
                onChange={(e) => onChange({ speakerGuess: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">目标角色</label>
              <input
                type="text"
                value={form.targetCharacterGuess}
                onChange={(e) => onChange({ targetCharacterGuess: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">角色置信度 (0-1)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.characterGuessConfidence ?? ''}
              onChange={(e) => onChange({ characterGuessConfidence: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Reason */}
      <section>
        <h4 className="text-xs font-medium text-gray-500 mb-2">LLM 理由</h4>
        <textarea
          value={form.reason}
          onChange={(e) => onChange({ reason: e.target.value })}
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </section>
    </div>
  );
}
