import type {
  EpisodeContext,
  PromptPackage,
  ShotCharacterRequirement,
  StoryExpansion,
  StoryboardResult,
} from './types.js';
import { runJsonChat } from './modelClient.js';
import {
  buildStoryboardSystemPrompt,
  buildStoryboardUserPrompt,
  normalizeStoryboardResult,
} from './promptBuilder.js';

function createRequiredCharacters(names: string[], primaryOnly = false): ShotCharacterRequirement[] {
  return names.map((characterName, index) => ({
    characterName,
    roleInShot: index === 0 ? '主视角' : '关键角色',
    mustAppear: primaryOnly ? index === 0 : true,
  }));
}

function buildFallbackStoryboard(
  story: StoryExpansion,
  promptPackage: PromptPackage,
  context: EpisodeContext,
): StoryboardResult {
  const targetCardCount = Math.max(3, promptPackage.targetCardCount ?? 6);
  const beats = story.storyBeats.length > 0
    ? story.storyBeats.slice(0, targetCardCount)
    : [
        story.summary.opening,
        story.summary.development,
        story.summary.twist,
        story.summary.ending,
      ];
  const normalizedBeats = beats.length >= targetCardCount
    ? beats.slice(0, targetCardCount)
    : Array.from({ length: targetCardCount }, (_, index) => beats[index] ?? beats[beats.length - 1] ?? story.summary.development);
  const focusCharacters = story.characterFocus.length > 0 ? story.characterFocus : (promptPackage.characterFocus ?? []);
  const primary = focusCharacters[0] ?? '主角';
  const support = focusCharacters[1] ?? '';
  const locationBase = promptPackage.selectedEntryPoint || context.episodeTitle || '关键场景';

  return normalizeStoryboardResult({
    storyTitle: story.title,
    storyHook: story.hook,
    readingMode: 'vertical_comic',
    visualStyle: story.visualStyle,
    globalCharacterConsistencyNotes: [
      `保持 ${focusCharacters.filter(Boolean).join('、') || primary} 的脸部、发型、服装一致`,
      '同一角色的情绪推进需要前后连贯',
    ],
    globalSceneConsistencyNotes: [
      `核心场景优先围绕 ${locationBase} 展开，保持空间识别度`,
      '关键道具和光线氛围尽量保持连续',
    ],
    shots: normalizedBeats.map((beat, index) => {
      const scene = index + 1;
      const isEnding = index === normalizedBeats.length - 1;
      const title = isEnding
        ? '结局收口'
        : index === 0
          ? '分支起点'
          : `推进 ${scene}`;
      const mustCharacters = createRequiredCharacters(
        [primary, support].filter(Boolean),
        false,
      );
      return {
        scene,
        sceneTitle: title,
        plotPurpose: isEnding ? '作为整条分支的最终收束画面' : '推进这一条分支的核心剧情节点',
        description: beat,
        narrationText: beat,
        narrationPlacement: 'below_image',
        dialogueText: index === 0
          ? `${primary}不再退了。`
          : isEnding
            ? `${primary}终于把局势扳了回来。`
            : '',
        subtitleText: '',
        requiredCharacters: mustCharacters,
        optionalCharacters: support
          ? [{
              characterName: support,
              roleInShot: '辅助情绪承接',
              mustAppear: false,
            }]
          : [],
        characterVisualNotes: '严格参考人物三视图，保持人物一致。',
        requiredScene: '',
        sceneVisualNotes: '',
        compositionNotes: isEnding
          ? '收束镜头，结局感明确。'
          : index === 0
            ? '起势镜头，人物关系清楚。'
            : '人物关系镜头，避免重复构图。',
        imagePrompt: '',
        negativePrompt: 'text, subtitles, caption, watermark, border, comic panel, poster layout, extra fingers, deformed face, blurry face, exaggerated pose',
        referenceTaskImages: {
          characterRefs: [],
          sceneRefs: [],
          styleRefs: [],
          carryNotes: '只参考角色三视图，保持脸型、发型、服装一致。',
        },
        assetReferences: {
          requiredCharacterRefs: mustCharacters.map((character) => character.characterName),
          optionalEnvironmentRefs: [],
          continuityNotes: ['严格参考人物三视图。', '保持同一套服装、发型和年龄状态。', '相邻分镜不要重复同一构图。', '画面中不要出现任何文字。'],
        },
        assetCarryNotes: '只参考角色三视图，保持脸型、发型、服装一致。',
        emotion: isEnding ? '余波未止的收束' : promptPackage.tone,
        location: locationBase,
      };
    }),
  }, story, promptPackage);
}

export async function generateStoryboard(
  story: StoryExpansion,
  promptPackage: PromptPackage,
  context: EpisodeContext,
): Promise<StoryboardResult> {
  try {
    const raw = await runJsonChat<{
      storyTitle?: string;
      storyHook?: string;
      readingMode?: string;
      visualStyle?: string;
      globalCharacterConsistencyNotes?: string[];
      globalSceneConsistencyNotes?: string[];
      shots?: Array<Record<string, unknown>>;
    }>({
      purpose: 'branch task storyboard generation',
      systemPrompt: buildStoryboardSystemPrompt(),
      userPrompt: buildStoryboardUserPrompt(context, promptPackage, story),
      modelEnvKeys: ['DEEPSEEK_BRANCH_TASK_MODEL', 'DEEPSEEK_STORY_CONTEXT_MODEL'],
    });
    const storyboard = normalizeStoryboardResult(raw, story, promptPackage);
    if (storyboard.shots.length >= 3) {
      return storyboard;
    }
  } catch {
    // Fall through to deterministic context-aware generation.
  }

  return buildFallbackStoryboard(story, promptPackage, context);
}
