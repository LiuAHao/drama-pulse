import type { EpisodeContext, PromptPackage, StoryExpansion } from './types.js';
import { runJsonChat } from './modelClient.js';
import {
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  normalizeStoryExpansion,
} from './promptBuilder.js';

function buildFallbackStory(promptPackage: PromptPackage, context: EpisodeContext): StoryExpansion {
  const {
    normalizedPrompt,
    branchType,
    tone,
    canonConstraints = [],
    characterFocus = [],
    selectedEntryPoint = '',
    currentConflict = '',
    unresolvedQuestions = [],
    seriesPremise = '',
  } = promptPackage;
  const focusCharacters = characterFocus.length > 0 ? characterFocus : ['主角'];
  const storyBeats = [
    selectedEntryPoint
      ? `尾集余波未散，${selectedEntryPoint}率先撬动了新的分支走向。`
      : `尾集结束后，新的波澜先从主角心底翻涌起来。`,
    `${focusCharacters.join('、')}被迫重新面对“${currentConflict || '未解冲突'}”，而用户提出的“${normalizedPrompt}”让原本封死的局面出现转机。`,
    canonConstraints.length > 0
      ? `在不违背既有事实的前提下，他们围绕${canonConstraints[0]}重新博弈，旧关系也随之被拉扯到极限。`
      : `旧关系被重新摆上台面，人物立场开始松动，误会与真相交错发酵。`,
    unresolvedQuestions[0]
      ? `当“${unresolvedQuestions[0]}”终于被正面触碰时，关键人物做出了不同于原结局的选择。`
      : `当最深的心结被正面触碰时，关键人物做出了不同于原结局的选择。`,
    `${focusCharacters[0]}最终用更主动的方式改写局势，让这个${tone}的尾声真正落到人物命运上。`,
  ];

  const rawStory = [
    `尾集原本停在“${currentConflict || context.episodeSummary}”上。`,
    `${seriesPremise ? `全剧主线“${seriesPremise}”并没有结束，` : ''}${focusCharacters.join('、')}只是被迫把真正的抉择留到了最后一刻。`,
    `当“${normalizedPrompt}”成为新的行动理由后，${selectedEntryPoint || '尾集留下的裂缝'}被彻底放大。`,
    storyBeats.map((beat, index) => `${index + 1}. ${beat}`).join('\n'),
    `这个分支没有推翻原剧事实，而是在既有因果上，给出了一个更${tone}、也更符合人物此刻状态的后续结局。`,
  ].join('\n\n');

  const summary = {
    opening: storyBeats[0] || '尾集刚结束，新的分支抉择已经开始酝酿。',
    development: storyBeats[1] || '人物被迫推进新的冲突。',
    twist: storyBeats[3] || '关键真相或立场开始翻转。',
    ending: storyBeats[4] || '这一条分支以新的结局状态收束。',
  };

  const cast = focusCharacters.map((characterName, index) => ({
    characterName,
    roleFunction: index === 0 ? '主视角' : '关键角色',
    required: index < 2,
  }));

  return normalizeStoryExpansion({
    direction: `${branchType}向分支，从“${selectedEntryPoint || currentConflict || context.episodeTitle}”继续推进`,
    title: `${context.dramaTitle}：${focusCharacters[0]}的${branchType === 'custom' ? '另一种' : tone}结局`,
    hook: `${focusCharacters[0]}若在这一刻不再退让，尾集之后的命运会被彻底改写。`,
    summary,
    conflict: currentConflict || context.episodeSummary,
    twist: summary.twist,
    ending: summary.ending,
    story: rawStory,
    tags: [branchType, context.mainGenre, 'story-context-grounded', 'branch-ending'],
    emotionTags: [tone, '命运改写', '关系拉扯'],
    storyBeats,
    characterFocus: focusCharacters,
    cast,
    endingState: `${focusCharacters[0]}取得了阶段性主动权，但新的关系余波仍在继续。`,
    visualStyle: `${tone}、人物对峙感强、近景情绪和关键道具并重`,
  }, context, promptPackage);
}

export async function generateStory(
  promptPackage: PromptPackage,
  context: EpisodeContext,
): Promise<StoryExpansion> {
  try {
    const raw = await runJsonChat<Partial<StoryExpansion>>({
      purpose: 'branch task story generation',
      systemPrompt: buildStorySystemPrompt(),
      userPrompt: buildStoryUserPrompt(context, promptPackage),
      modelEnvKeys: ['DEEPSEEK_BRANCH_TASK_MODEL', 'DEEPSEEK_STORY_CONTEXT_MODEL'],
    });
    const normalized = normalizeStoryExpansion(raw, context, promptPackage);
    if (normalized.storyBeats.length >= 3 && normalized.characterFocus.length > 0) {
      if (normalized.tags.length === 0) {
        normalized.tags = [promptPackage.branchType, context.mainGenre, 'story-context-grounded', 'branch-ending'];
      }
      if (normalized.emotionTags.length === 0) {
        normalized.emotionTags = [promptPackage.tone, '情绪递进'];
      }
      return normalized;
    }
  } catch {
    // Fall through to deterministic context-aware generation.
  }

  return buildFallbackStory(promptPackage, context);
}
