import type {
  EpisodeContext,
  PromptPackage,
  ReferenceAssetItem,
  ReferenceTaskImageSet,
  ShotAssetReferences,
  ShotCharacterRequirement,
  ShotPrompt,
  StoryContextCharacter,
  StoryExpansion,
  StoryboardResult,
} from './types.js';

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function normalizeCharacterNames(characters: StoryContextCharacter[] | undefined): string[] {
  if (!Array.isArray(characters)) return [];
  return characters
    .map((character) => (typeof character?.name === 'string' ? character.name.trim() : ''))
    .filter(Boolean);
}

function scoreMatch(prompt: string, candidate: string): number {
  if (!candidate) return 0;
  const loweredPrompt = prompt.toLowerCase();
  return candidate
    .split(/[\s，。、“”‘’（）()、/]+/)
    .filter((token) => token.length >= 2)
    .reduce((score, token) => (loweredPrompt.includes(token.toLowerCase()) ? score + 1 : score), 0);
}

export function pickCharacterFocus(context: EpisodeContext, promptText: string): string[] {
  const names = normalizeCharacterNames(context.storyContextPackage?.characterBible);
  if (names.length === 0) return [];

  const ranked = names
    .map((name) => ({ name, score: scoreMatch(promptText, name) }))
    .sort((left, right) => right.score - left.score);

  const focused = ranked.filter((item) => item.score > 0).map((item) => item.name);
  if (focused.length > 0) {
    return focused.slice(0, 4);
  }
  return names.slice(0, 4);
}

export function pickSelectedEntryPoint(context: EpisodeContext, promptText: string): string {
  const entryPoints = normalizeStringList(context.tailStateSnapshot?.branchEntryPoints);
  if (entryPoints.length === 0) return '';

  const ranked = entryPoints
    .map((entry) => ({ entry, score: scoreMatch(promptText, entry) }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.entry ?? entryPoints[0];
}

export function buildStorySystemPrompt(): string {
  return `你是短剧尾集分支编剧助手。

你的任务是根据用户提示词、尾集状态快照和全剧上下文，生成“承接原剧尾集”的后续分支剧情。

输出要求：
1. 只输出一个 JSON 对象，不要附带解释。
2. JSON 字段必须包含：
   - direction: 一句话概括分支方向
   - title: 分支标题
   - hook: 一句吸引用户继续看的 hook
   - summary: 对象，必须包含 opening / development / twist / ending 四段
   - conflict: 核心冲突
   - twist: 关键反转
   - ending: 最终结局
   - story: 500 到 1200 字中文剧情正文，要求承接尾集、人物不跑偏
   - tags: 3 到 6 个标签数组
   - emotionTags: 2 到 4 个情绪标签
   - storyBeats: 5 到 12 条关键剧情节点数组，必须适合后续拆成图文分镜
   - characterFocus: 2 到 5 个角色名数组
   - cast: 角色数组，每项至少包含 characterName / roleFunction / required
   - endingState: 一句话说明本分支收束状态
   - visualStyle: 一句话说明后续分镜的视觉气质
3. 必须遵守输入中的 canon constraints / hard constraints。
4. 不要推翻已经发生的事实，不要把人物写出戏。`;
}

export function buildStoryUserPrompt(context: EpisodeContext, promptPackage: PromptPackage): string {
  const characterBible = (context.storyContextPackage?.characterBible ?? []).map((character) => ({
    name: character.name ?? '',
    role: character.role ?? '',
    currentState: character.currentState ?? '',
    constraints: character.constraints ?? [],
  }));

  return JSON.stringify({
    userPrompt: promptPackage.normalizedPrompt,
    branchType: promptPackage.branchType,
    tone: promptPackage.tone,
    targetCardCount: promptPackage.targetCardCount ?? 6,
    generationMode: promptPackage.generationMode ?? 'custom',
    currentConflict: promptPackage.currentConflict ?? context.tailStateSnapshot?.currentConflict ?? '',
    selectedEntryPoint: promptPackage.selectedEntryPoint ?? '',
    unresolvedQuestions: promptPackage.unresolvedQuestions ?? [],
    characterFocus: promptPackage.characterFocus ?? [],
    episodeContext: {
      dramaTitle: context.dramaTitle,
      episodeTitle: context.episodeTitle,
      episodeSummary: context.episodeSummary,
      mainGenre: context.mainGenre,
    },
    seriesOverview: context.storyContextPackage?.seriesOverview ?? {},
    tailStateSnapshot: context.tailStateSnapshot ?? {},
    characterBible,
    canonConstraints: promptPackage.canonConstraints ?? [],
  }, null, 2);
}

export function buildStoryboardSystemPrompt(): string {
  return `你是短剧图文分镜导演助手。

你要把一个尾集分支剧情，拆成可直接生图、可直接展示在“上下滑漫画 / 带图小说”页面中的分镜结果。
注意：页面是上下滑阅读，但每一张分镜图本身必须优先生成“横屏卡面”效果，方便在手机里以图片在上、长文案在下的方式展示，避免生成过长的竖图。

输出要求：
1. 只输出一个 JSON 对象，不要附带解释。
2. 顶层字段必须包含：
   - storyTitle
   - storyHook
   - readingMode: 固定为 vertical_comic
   - visualStyle
   - globalCharacterConsistencyNotes: 数组
   - globalSceneConsistencyNotes: 数组
   - shots: 数组
3. shots 数量必须尽量贴近输入里的 targetCardCount。
4. 每个 shot 至少包含：
   - scene
   - sceneTitle
   - plotPurpose
   - description
   - narrationText
   - narrationPlacement: 固定为 below_image
   - dialogueText
   - subtitleText
   - requiredCharacters
   - optionalCharacters
   - characterVisualNotes
   - requiredScene
   - sceneVisualNotes
   - compositionNotes
   - imagePrompt
   - negativePrompt
   - referenceTaskImages
   - assetReferences
   - assetCarryNotes
   - emotion
   - location
5. imagePrompt 必须是一条可以直接交给生图模型的完整提示词，写到：
   - 人物
   - 动作
   - 场景
   - 构图
   - 光线
   - 情绪
   - 风格
   - 明确说明这是横屏分镜卡面，适合手机端图上文下展示
6. requiredCharacters 不能只写名字，要说明 roleInShot 和 mustAppear。
7. narrationText 默认是图下长文案，信息量要明显高于 dialogueText。
8. 最后一张必须明显具有结局收口作用。`;
}

export function buildStoryboardUserPrompt(
  context: EpisodeContext,
  promptPackage: PromptPackage,
  storyExpansion: StoryExpansion,
): string {
  return JSON.stringify({
    dramaTitle: context.dramaTitle,
    episodeTitle: context.episodeTitle,
    mainGenre: context.mainGenre,
    userPrompt: promptPackage.normalizedPrompt,
    branchType: promptPackage.branchType,
    tone: promptPackage.tone,
    generationMode: promptPackage.generationMode ?? 'custom',
    targetCardCount: promptPackage.targetCardCount ?? 6,
    selectedEntryPoint: promptPackage.selectedEntryPoint ?? '',
    currentConflict: promptPackage.currentConflict ?? '',
    storyExpansion,
    tailStateSnapshot: context.tailStateSnapshot ?? {},
    canonConstraints: promptPackage.canonConstraints ?? [],
    characterBible: (context.storyContextPackage?.characterBible ?? []).map((c) => ({
      name: c.name ?? '',
      role: c.role ?? '',
      currentState: c.currentState ?? '',
    })),
  }, null, 2);
}

function normalizeCast(raw: unknown): StoryExpansion['cast'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const value = item as Record<string, unknown>;
      const characterName = typeof value.characterName === 'string' ? value.characterName.trim() : '';
      if (!characterName) return null;
      return {
        characterName,
        roleFunction: typeof value.roleFunction === 'string' && value.roleFunction.trim()
          ? value.roleFunction.trim()
          : '关键角色',
        required: Boolean(value.required),
      };
    })
    .filter((item): item is StoryExpansion['cast'][number] => Boolean(item));
}

function normalizeSummary(raw: unknown, story: string): StoryExpansion['summary'] {
  const fallback = {
    opening: story.slice(0, 80) || '承接尾集后的局势变化。',
    development: '人物被迫推进新的冲突。',
    twist: '关键真相或立场开始翻转。',
    ending: '分支以新的结局状态收束。',
  };
  if (!raw || typeof raw !== 'object') return fallback;
  const value = raw as Record<string, unknown>;
  return {
    opening: typeof value.opening === 'string' && value.opening.trim() ? value.opening.trim() : fallback.opening,
    development: typeof value.development === 'string' && value.development.trim() ? value.development.trim() : fallback.development,
    twist: typeof value.twist === 'string' && value.twist.trim() ? value.twist.trim() : fallback.twist,
    ending: typeof value.ending === 'string' && value.ending.trim() ? value.ending.trim() : fallback.ending,
  };
}

export function normalizeStoryExpansion(
  raw: Partial<StoryExpansion>,
  context: EpisodeContext,
  promptPackage: PromptPackage,
): StoryExpansion {
  const storyBeats = normalizeStringList(raw.storyBeats);
  const characterFocus = normalizeStringList(raw.characterFocus);
  const title = raw.title?.trim() || `${context.dramaTitle}：${context.episodeTitle}的另一种结局`;
  const hook = raw.hook?.trim() || `${context.episodeTitle}之后，命运的分叉点被重新点燃。`;
  const story = raw.story?.trim() || [
    `${title}`,
    '',
    hook,
    '',
    ...storyBeats,
  ].join('\n');
  const cast = normalizeCast(raw.cast);

  return {
    direction: raw.direction?.trim() || `${promptPackage.branchType}向分支，承接尾集冲突继续推进`,
    title,
    hook,
    summary: normalizeSummary(raw.summary, story),
    conflict: raw.conflict?.trim() || (promptPackage.currentConflict || context.episodeSummary),
    twist: raw.twist?.trim() || storyBeats[Math.min(2, Math.max(0, storyBeats.length - 1))] || '',
    ending: raw.ending?.trim() || raw.endingState?.trim() || '',
    story,
    tags: normalizeStringList(raw.tags).slice(0, 6),
    emotionTags: normalizeStringList(raw.emotionTags).slice(0, 4),
    storyBeats: storyBeats.slice(0, Math.max(4, promptPackage.targetCardCount ?? 6)),
    characterFocus: characterFocus.slice(0, 5),
    cast: cast.length > 0
      ? cast
      : characterFocus.slice(0, 4).map((characterName) => ({
          characterName,
          roleFunction: '关键角色',
          required: true,
        })),
    endingState: raw.endingState?.trim() || raw.ending?.trim() || '',
    visualStyle: raw.visualStyle?.trim() || `${promptPackage.tone}、情绪递进、人物冲突突出`,
  };
}

function normalizeReferenceAssetItem(raw: unknown, fallbackType: ReferenceAssetItem['assetType']): ReferenceAssetItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const assetPath = typeof value.assetPath === 'string' ? value.assetPath.trim() : '';
  if (!assetPath) return null;
  return {
    assetId: typeof value.assetId === 'string' && value.assetId.trim() ? value.assetId.trim() : assetPath,
    assetType: (value.assetType === 'character' || value.assetType === 'scene' || value.assetType === 'style')
      ? value.assetType
      : fallbackType,
    assetPath,
    displayName: typeof value.displayName === 'string' && value.displayName.trim() ? value.displayName.trim() : assetPath,
    usage: typeof value.usage === 'string' && value.usage.trim() ? value.usage.trim() : '参考一致性',
    priority: value.priority === 'required' || value.priority === 'recommended' || value.priority === 'optional'
      ? value.priority
      : 'required',
    source: value.source === 'local' || value.source === 'generated' || value.source === 'inferred'
      ? value.source
      : 'local',
  };
}

function normalizeReferenceTaskImages(raw: unknown): ReferenceTaskImageSet {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const mapGroup = (group: unknown, fallbackType: ReferenceAssetItem['assetType']) =>
    Array.isArray(group)
      ? group
          .map((item) => normalizeReferenceAssetItem(item, fallbackType))
          .filter((item): item is ReferenceAssetItem => Boolean(item))
      : [];
  return {
    characterRefs: mapGroup(value.characterRefs, 'character'),
    sceneRefs: mapGroup(value.sceneRefs, 'scene'),
    styleRefs: mapGroup(value.styleRefs, 'style'),
    carryNotes: typeof value.carryNotes === 'string' ? value.carryNotes.trim() : '',
  };
}

function normalizeCharacterRequirements(raw: unknown, mustAppear: boolean, fallbackNames: string[]): ShotCharacterRequirement[] {
  const list = Array.isArray(raw) && raw.length > 0
    ? raw
    : fallbackNames.map((name) => ({ characterName: name, roleInShot: '关键角色', mustAppear }));
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const value = item as Record<string, unknown>;
      const characterName = typeof value.characterName === 'string' ? value.characterName.trim() : '';
      if (!characterName) return null;
      return {
        characterName,
        roleInShot: typeof value.roleInShot === 'string' && value.roleInShot.trim() ? value.roleInShot.trim() : '关键角色',
        mustAppear: typeof value.mustAppear === 'boolean' ? value.mustAppear : mustAppear,
      };
    })
    .filter((item): item is ShotCharacterRequirement => Boolean(item));
}

function normalizeShotAssetReferences(raw: unknown, fallbackCharacters: string[], fallbackLocation: string): ShotAssetReferences {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    requiredCharacterRefs: normalizeStringList(value.requiredCharacterRefs).slice(0, 6).length > 0
      ? normalizeStringList(value.requiredCharacterRefs).slice(0, 6)
      : fallbackCharacters,
    optionalEnvironmentRefs: normalizeStringList(value.optionalEnvironmentRefs).slice(0, 4).length > 0
      ? normalizeStringList(value.optionalEnvironmentRefs).slice(0, 4)
      : (fallbackLocation ? [fallbackLocation] : []),
    continuityNotes: normalizeStringList(value.continuityNotes).slice(0, 6),
  };
}

function ensureCardsCount<T>(items: T[], target: number): T[] {
  if (items.length === 0) return items;
  if (items.length === target) return items;
  if (items.length > target) return items.slice(0, target);

  const padded = [...items];
  while (padded.length < target) {
    padded.push({ ...padded[padded.length - 1] });
  }
  return padded;
}

function buildGlobalCharacterNotes(shots: ShotPrompt[]): string[] {
  const characterRefs = Array.from(new Set(
    shots.flatMap((shot) => shot.requiredCharacters.map((character) => character.characterName)),
  ));
  if (characterRefs.length === 0) {
    return ['保持同一角色脸部、发型、服装和年龄感连续一致'];
  }
  return [
    `保持 ${characterRefs.join('、')} 的脸部、发型、服装和年龄感连续一致`,
    '同一角色的情绪推进要前后连贯，不能突然跳变',
  ];
}

function buildGlobalSceneNotes(shots: ShotPrompt[]): string[] {
  const locations = Array.from(new Set(shots.map((shot) => shot.location).filter(Boolean)));
  return locations.length > 0
    ? [
        `优先保持这些关键场景的空间关系稳定：${locations.join('、')}`,
        '场景光线、时间段和关键道具尽量前后呼应',
      ]
    : ['场景光线、时间段和关键道具尽量前后呼应'];
}

function sanitizeNarrativeMoment(text: string): string {
  return text
    .replace(/用户提出的“[^”]+”/g, '人物做出了新的选择')
    .replace(/用户提出的"[^"]+"/g, '人物做出了新的选择')
    .replace(/要求承接原剧事实[^，。]*/g, '')
    .replace(/尾集固定分支结局/g, '分支结局')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

export function normalizeStoryboardResult(
  raw: {
    storyTitle?: string;
    storyHook?: string;
    readingMode?: string;
    visualStyle?: string;
    globalCharacterConsistencyNotes?: unknown;
    globalSceneConsistencyNotes?: unknown;
    shots?: Array<Partial<ShotPrompt>>;
  },
  storyExpansion: StoryExpansion,
  promptPackage: PromptPackage,
): StoryboardResult {
  const targetCardCount = Math.max(3, promptPackage.targetCardCount ?? 6);
  const rawShots = ensureCardsCount(Array.isArray(raw.shots) ? raw.shots.slice(0, targetCardCount) : [], targetCardCount);

  const storyBeats = storyExpansion.storyBeats.length > 0
    ? ensureCardsCount(storyExpansion.storyBeats, targetCardCount)
    : ensureCardsCount([
        storyExpansion.summary.opening,
        storyExpansion.summary.development,
        storyExpansion.summary.twist,
        storyExpansion.summary.ending,
      ], targetCardCount);

  const sourceShots: Array<Partial<ShotPrompt>> = rawShots.length > 0
    ? rawShots
    : storyBeats.map((beat) => ({ description: beat }));

  const shots = sourceShots.map((rawShot, index) => {
    const fallbackCharacters = storyExpansion.characterFocus.slice(0, 3);
    const location = typeof rawShot.location === 'string' && rawShot.location.trim()
      ? rawShot.location.trim()
      : (promptPackage.selectedEntryPoint || storyExpansion.summary.opening || '关键场景');
    const description = typeof rawShot.description === 'string' && rawShot.description.trim()
      ? rawShot.description.trim()
      : storyBeats[index] || storyExpansion.storyBeats[index] || storyExpansion.summary.development;
    const sceneTitle = typeof rawShot.sceneTitle === 'string' && rawShot.sceneTitle.trim()
      ? rawShot.sceneTitle.trim()
      : (index === targetCardCount - 1 ? '结局收口' : `分镜 ${index + 1}`);
    const requiredCharacters = normalizeCharacterRequirements(rawShot.requiredCharacters, true, fallbackCharacters);
    const optionalCharacters = normalizeCharacterRequirements(rawShot.optionalCharacters, false, []);
    const assetReferences = normalizeShotAssetReferences(rawShot.assetReferences, requiredCharacters.map((item) => item.characterName), location);
    const referenceTaskImages = normalizeReferenceTaskImages(rawShot.referenceTaskImages);
    const narrationText = typeof rawShot.narrationText === 'string' && rawShot.narrationText.trim()
      ? rawShot.narrationText.trim()
      : description;
    const dialogueText = typeof rawShot.dialogueText === 'string' ? rawShot.dialogueText.trim() : '';

    return {
      scene: typeof rawShot.scene === 'number' ? rawShot.scene : index + 1,
      sceneTitle,
      plotPurpose: typeof rawShot.plotPurpose === 'string' && rawShot.plotPurpose.trim()
        ? rawShot.plotPurpose.trim()
        : (index === targetCardCount - 1 ? '作为分支结局的最终收口画面' : '推进这一条分支的核心剧情'),
      description,
      narrationText,
      narrationPlacement: 'below_image',
      dialogueText,
      subtitleText: typeof rawShot.subtitleText === 'string' && rawShot.subtitleText.trim()
        ? rawShot.subtitleText.trim()
        : dialogueText,
      requiredCharacters,
      optionalCharacters,
      characterVisualNotes: typeof rawShot.characterVisualNotes === 'string' && rawShot.characterVisualNotes.trim()
        ? rawShot.characterVisualNotes.trim()
        : '主角保持画面重心，配角负责承接关系和情绪反应。',
      requiredScene: typeof rawShot.requiredScene === 'string' && rawShot.requiredScene.trim()
        ? rawShot.requiredScene.trim()
        : location,
      sceneVisualNotes: typeof rawShot.sceneVisualNotes === 'string' && rawShot.sceneVisualNotes.trim()
        ? rawShot.sceneVisualNotes.trim()
        : '保持关键空间识别度，不要做成空背景。',
        compositionNotes: typeof rawShot.compositionNotes === 'string' && rawShot.compositionNotes.trim()
        ? rawShot.compositionNotes.trim()
        : (index === targetCardCount - 1 ? '横屏结局卡面要有明显收束感，适合图上文下展示。' : '横屏分镜卡面的人物关系构图要清楚，适合手机端图上文下展示。'),
      imagePrompt: typeof rawShot.imagePrompt === 'string' && rawShot.imagePrompt.trim()
        ? rawShot.imagePrompt.trim()
        : '',
      negativePrompt: typeof rawShot.negativePrompt === 'string' && rawShot.negativePrompt.trim()
        ? rawShot.negativePrompt.trim()
        : 'modern clothes, extra fingers, deformed face, empty background, western architecture, ad-style pose',
      referenceTaskImages,
      assetReferences,
      assetCarryNotes: typeof rawShot.assetCarryNotes === 'string' && rawShot.assetCarryNotes.trim()
        ? rawShot.assetCarryNotes.trim()
        : '保持人物脸部、服装、场景和关键道具连续一致。',
      emotion: typeof rawShot.emotion === 'string' && rawShot.emotion.trim()
        ? rawShot.emotion.trim()
        : (index === targetCardCount - 1 ? '收束后的余波' : promptPackage.tone),
      location,
    } satisfies ShotPrompt;
  }).map((shot) => ({
      ...shot,
      imagePrompt: shot.imagePrompt || [
      'landscape cinematic storyboard card frame for mobile reading',
      `${shot.requiredScene}`,
      shot.requiredCharacters.length > 0
        ? `characters: ${shot.requiredCharacters.map((character) => character.characterName).join(', ')}`
        : '',
      shot.characterVisualNotes,
      shot.sceneVisualNotes,
      shot.compositionNotes,
      `emotion: ${shot.emotion}`,
      `narrative moment: ${sanitizeNarrativeMoment(shot.description)}`,
      'horizontal composition, image on top with long narration text below in the final mobile layout, avoid extra tall portrait framing',
      `style: ${storyExpansion.visualStyle}`,
    ].filter(Boolean).join(', '),
  }));

  return {
    shots,
    shotPromptPackage: {
      contractVersion: 'branch-image-story-v1',
      storyTitle: raw.storyTitle?.trim() || storyExpansion.title,
      storyHook: raw.storyHook?.trim() || storyExpansion.hook,
      readingMode: 'vertical_comic',
      visualStyle: raw.visualStyle?.trim() || storyExpansion.visualStyle,
      globalCharacterConsistencyNotes: normalizeStringList(raw.globalCharacterConsistencyNotes).length > 0
        ? normalizeStringList(raw.globalCharacterConsistencyNotes)
        : buildGlobalCharacterNotes(shots),
      globalSceneConsistencyNotes: normalizeStringList(raw.globalSceneConsistencyNotes).length > 0
        ? normalizeStringList(raw.globalSceneConsistencyNotes)
        : buildGlobalSceneNotes(shots),
      shots,
    },
  };
}
