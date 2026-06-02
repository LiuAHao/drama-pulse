import type { BranchType, EpisodeContext, PromptPackage } from './types.js';
import { pickCharacterFocus, pickSelectedEntryPoint } from './promptBuilder.js';

const BRANCH_TYPE_KEYWORDS: Record<BranchType, string[]> = {
  romance: ['爱情', '恋人', '甜蜜', '告白', '在一起', '心动', 'love', 'romantic'],
  reversal: ['反转', '逆袭', '翻转', '意想不到', '反转结局', 'reversal', 'twist'],
  suspense: ['悬疑', '真相', '秘密', '推理', '凶手', 'mystery', 'suspense'],
  comedy: ['搞笑', '喜剧', '欢乐', '沙雕', '无厘头', 'funny', 'comedy'],
  tragedy: ['悲剧', '虐心', '分离', '牺牲', '遗憾', 'tragedy', 'sad'],
  custom: [],
};

function classifyBranchType(prompt: string): BranchType {
  const lower = prompt.toLowerCase();
  for (const [type, keywords] of Object.entries(BRANCH_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return type as BranchType;
    }
  }
  return 'custom';
}

function extractKeywords(prompt: string): string[] {
  const words = prompt
    .replace(/[，。！？、；：""''（）\[\]【】,.!?;:'"()\[\]]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return [...new Set(words)].slice(0, 10);
}

export function interpretPrompt(userPrompt: string, context: EpisodeContext): PromptPackage {
  const branchType = classifyBranchType(userPrompt);
  const keywords = extractKeywords(userPrompt);
  const canonConstraints = [
    ...(context.storyContextPackage?.canonConstraints ?? []),
    ...(context.tailStateSnapshot?.hardConstraints ?? []),
  ].slice(0, 8);
  const characterFocus = pickCharacterFocus(context, userPrompt);
  const selectedEntryPoint = pickSelectedEntryPoint(context, userPrompt);
  const unresolvedQuestions = (context.tailStateSnapshot?.unresolvedQuestions ?? []).slice(0, 4);
  const currentConflict = context.tailStateSnapshot?.currentConflict ?? '';
  const seriesPremise = context.storyContextPackage?.seriesOverview?.seriesPremise ?? '';
  const mainConflict = context.storyContextPackage?.seriesOverview?.mainConflict ?? '';

  const toneMap: Record<BranchType, string> = {
    romance: '温馨浪漫',
    reversal: '出人意料',
    suspense: '紧张悬疑',
    comedy: '轻松幽默',
    tragedy: '深沉感人',
    custom: '自然流畅',
  };

  return {
    originalPrompt: userPrompt,
    normalizedPrompt: userPrompt.trim(),
    branchType,
    tone: toneMap[branchType],
    keywords,
    storyContextVersion: context.storyContextVersion,
    canonConstraints,
    characterFocus,
    selectedEntryPoint,
    currentConflict,
    unresolvedQuestions,
    seriesPremise,
    mainConflict,
  };
}
