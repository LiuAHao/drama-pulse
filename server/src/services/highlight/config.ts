export const CLIENT_HIGHLIGHT_TYPES = [
  'feel_good',
  'reversal',
  'funny',
  'sweet',
  'conflict',
] as const;

export const HIGHLIGHT_TEMPLATE_IDS = [
  'emotion_button',
  'vote_side',
  'suspense_lock',
  'boost_action',
] as const;

export const QUICK_PROMPT_MAX_INTENSITY = 2;

export type ClientHighlightType = (typeof CLIENT_HIGHLIGHT_TYPES)[number];
export type HighlightTemplateId = (typeof HIGHLIGHT_TEMPLATE_IDS)[number];
export type HighlightDisplayMode = 'quick_prompt' | 'interactive_component';

interface NormalizeHighlightInput {
  type?: string | null;
  intensity?: number | null;
  templateId?: string | null;
}

export interface NormalizedHighlightConfig {
  type: ClientHighlightType;
  intensity: number;
  templateId: HighlightTemplateId;
  displayMode: HighlightDisplayMode;
  resolvedInteractionType: HighlightTemplateId;
  soundEnabled: boolean;
  singleUse: boolean;
}

export function normalizeHighlightType(rawType: string | null | undefined): ClientHighlightType {
  if (rawType === 'feel_good'
    || rawType === 'reversal'
    || rawType === 'funny'
    || rawType === 'sweet'
    || rawType === 'conflict') {
    return rawType;
  }
  return 'feel_good';
}

export function normalizeHighlightIntensity(rawIntensity: number | null | undefined): number {
  if (!Number.isFinite(rawIntensity)) return 3;
  return Math.min(5, Math.max(1, Math.round(Number(rawIntensity))));
}

function normalizeInteractiveTemplate(rawTemplateId: string | null | undefined): HighlightTemplateId {
  if (rawTemplateId === 'vote_side' || rawTemplateId === 'suspense_lock' || rawTemplateId === 'boost_action') {
    return rawTemplateId;
  }
  return 'boost_action';
}

export function normalizeHighlightConfig(input: NormalizeHighlightInput): NormalizedHighlightConfig {
  const type = normalizeHighlightType(input.type);
  const intensity = normalizeHighlightIntensity(input.intensity);
  const isQuickPrompt = intensity <= QUICK_PROMPT_MAX_INTENSITY;
  const templateId: HighlightTemplateId = isQuickPrompt
    ? 'emotion_button'
    : normalizeInteractiveTemplate(input.templateId);

  return {
    type,
    intensity,
    templateId,
    displayMode: isQuickPrompt ? 'quick_prompt' : 'interactive_component',
    resolvedInteractionType: templateId,
    soundEnabled: !isQuickPrompt,
    singleUse: isQuickPrompt,
  };
}
