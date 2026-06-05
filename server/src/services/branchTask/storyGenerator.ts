import type { EpisodeContext, PromptPackage, StoryExpansion } from './types.js';
import { runJsonChat } from './modelClient.js';
import {
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  normalizeStoryExpansion,
} from './promptBuilder.js';

interface FallbackIntentProfile {
  titleLabel: string;
  hook: string;
  actionBeat: string;
  extraBeat: string;
  twistBeat: string;
  endingBeat: string;
  visualStyle: string;
  emotionTags: string[];
  endingState: string;
}

function inferFallbackIntent(promptPackage: PromptPackage, focusCharacter: string): FallbackIntentProfile {
  const prompt = `${promptPackage.normalizedPrompt} ${promptPackage.keywords.join(' ')}`.toLowerCase();
  const unresolvedQuestion = promptPackage.unresolvedQuestions?.[0] || '尾集没说透的真相';
  const entryPoint = promptPackage.selectedEntryPoint || '尾集留下的裂缝';

  if (
    promptPackage.branchType === 'suspense'
    || /真相|秘密|揭开|查清|背后|隐情|谜团|线索/.test(prompt)
  ) {
    return {
      titleLabel: '真相回收结局',
      hook: `尾集没说透的那层真相被重新掀开后，${focusCharacter}才发现真正该改写的是这层关系。`,
      actionBeat: `${focusCharacter}决定顺着${entryPoint}继续追查被遮住的真相，不再接受表面的说法。`,
      extraBeat: `${focusCharacter}顺着“${unresolvedQuestion}”追查下去，在${entryPoint}后面的细节里先看到了被遮住的另一面。`,
      twistBeat: `被藏住的证据和动机被重新摆上台面后，原本被误判的关系与立场同时翻了面。`,
      endingBeat: `${focusCharacter}没有再接受原结局里的误会，而是借真相回收把整段关系重新定义。`,
      visualStyle: '线索感强、信息递进、近景表情与关键物件并重',
      emotionTags: ['真相揭开', '关系翻面', '后劲回收'],
      endingState: `${focusCharacter}拿回了解释权，尾集之后的人物关系也因此被重新排序。`,
    };
  }

  if (
    promptPackage.branchType === 'romance'
    || /情绪|关系|和解|说出口|告白|心意|兑现|重组|拥抱/.test(prompt)
  ) {
    return {
      titleLabel: '情绪兑现结局',
      hook: `比输赢更先落地的，是${focusCharacter}终于把那句压到最后都没说出口的话说了出来。`,
      actionBeat: `${focusCharacter}决定不再回避情绪和关系，主动把最关键的话当面说清。`,
      extraBeat: `${focusCharacter}不再只盯着表面的输赢，而是顺着${entryPoint}把最核心的情绪裂口当面挑开。`,
      twistBeat: `一直被压着的心结被说破之后，原本僵住的关系开始出现新的站位和回应。`,
      endingBeat: `${focusCharacter}用一次真正说出口的选择，把尾集之后的关系拉进了新的结局方向。`,
      visualStyle: '情绪近景、关系拉扯、停顿感强、文案承接更长',
      emotionTags: ['情绪兑现', '关系重组', '余韵收束'],
      endingState: `${focusCharacter}和关键人物之间终于完成了一次正面回应，新的关系秩序开始成立。`,
    };
  }

  return {
    titleLabel: '翻盘反击结局',
    hook: `${focusCharacter}没有被原结局按在原地，而是抢在所有人之前先把这盘局翻了过来。`,
    actionBeat: `${focusCharacter}决定借着${entryPoint}留下的余波先发制人，主动改写已经失控的局势。`,
    extraBeat: `${focusCharacter}借着${entryPoint}留下的余波先一步设局反击，让“${promptPackage.currentConflict || '未解冲突'}”不再只按原路推进。`,
    twistBeat: `当对手还以为局面会照旧失控时，${focusCharacter}已经把主动权重新抢回自己手里。`,
    endingBeat: `${focusCharacter}用一次更强势的出手把尾集后的第一轮对局彻底翻盘，也逼出了新的后续余波。`,
    visualStyle: '反击感强、动作驱动、对峙压迫、关键道具突出',
    emotionTags: ['翻盘反击', '主动出手', '局势逆转'],
    endingState: `${focusCharacter}夺回了阶段性主动权，尾集后的局面也被迫改按她的节奏继续。`,
  };
}

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
  const focusCharacter = focusCharacters[0] || '主角';
  const intent = inferFallbackIntent(promptPackage, focusCharacter);
  const storyBeats = [
    selectedEntryPoint
      ? `尾集余波未散，${selectedEntryPoint}率先撬动了新的分支走向。`
      : `尾集结束后，新的波澜先从主角心底翻涌起来。`,
    `${focusCharacters.join('、')}被迫重新面对“${currentConflict || '未解冲突'}”，而这一次，${intent.actionBeat}`,
    intent.extraBeat,
    canonConstraints.length > 0
      ? `在不违背既有事实的前提下，他们围绕${canonConstraints[0]}重新博弈，旧关系也随之被拉扯到极限。`
      : `旧关系被重新摆上台面，人物立场开始松动，误会与真相交错发酵。`,
    unresolvedQuestions[0]
      ? `当“${unresolvedQuestions[0]}”终于被正面触碰时，关键人物做出了不同于原结局的选择。`
      : `当最深的心结被正面触碰时，关键人物做出了不同于原结局的选择。`,
    intent.twistBeat,
    intent.endingBeat,
  ];

  const rawStory = [
    `尾集原本停在“${currentConflict || context.episodeSummary}”上。`,
    `${seriesPremise ? `全剧主线“${seriesPremise}”并没有结束，` : ''}${focusCharacters.join('、')}只是被迫把真正的抉择留到了最后一刻。`,
    `这一次，${intent.actionBeat}`,
    storyBeats.map((beat, index) => `${index + 1}. ${beat}`).join('\n'),
    `这个分支没有推翻原剧事实，而是在既有因果上，给出了一个更${tone}、也更符合人物此刻状态的后续结局。`,
  ].join('\n\n');

  const summary = {
    opening: storyBeats[0] || '尾集刚结束，新的分支抉择已经开始酝酿。',
    development: [storyBeats[1], storyBeats[2]].filter(Boolean).join(' ') || '人物被迫推进新的冲突。',
    twist: [storyBeats[3], storyBeats[4]].filter(Boolean).join(' ') || '关键真相或立场开始翻转。',
    ending: storyBeats[5] || '这一条分支以新的结局状态收束。',
  };

  const cast = focusCharacters.map((characterName, index) => ({
    characterName,
    roleFunction: index === 0 ? '主视角' : '关键角色',
    required: index < 2,
  }));

  return normalizeStoryExpansion({
    direction: `${branchType}向分支，从“${selectedEntryPoint || currentConflict || context.episodeTitle}”继续推进`,
    title: `${context.dramaTitle}：${focusCharacter}的${intent.titleLabel}`,
    hook: intent.hook,
    summary,
    conflict: currentConflict || context.episodeSummary,
    twist: summary.twist,
    ending: summary.ending,
    story: rawStory,
    tags: [branchType, context.mainGenre, 'story-context-grounded', 'branch-ending'],
    emotionTags: [tone, ...intent.emotionTags],
    storyBeats,
    characterFocus: focusCharacters,
    cast,
    endingState: intent.endingState,
    visualStyle: `${tone}、${intent.visualStyle}`,
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
