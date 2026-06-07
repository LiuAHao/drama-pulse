import { describe, expect, it } from 'vitest';
import { applyReferenceAssetsToStoryboard } from '../../src/services/branchTask/assetCollector.js';
import type { CollectedReferenceAssets } from '../../src/services/branchTask/assetCollector.js';
import type { StoryboardResult } from '../../src/services/branchTask/types.js';

function buildStoryboard(): StoryboardResult {
  return {
    shots: [
      {
        scene: 1,
        sceneTitle: '分支起点',
        plotPurpose: '建立场景',
        description: '程中安站在院门口迎上众人。',
        narrationText: '程中安站在院门口迎上众人。',
        narrationPlacement: 'below_image',
        dialogueText: '今天我不退了。',
        subtitleText: '今天我不退了。',
        requiredCharacters: [
          { characterName: '程中安（娘）', roleInShot: '主角', mustAppear: true },
          { characterName: '大山', roleInShot: '关键角色', mustAppear: true },
        ],
        optionalCharacters: [],
        characterVisualNotes: '主角站在画面中心。',
        requiredScene: '老宅院门口',
        sceneVisualNotes: '黄昏土墙院落。',
        compositionNotes: '竖屏中心构图。',
        imagePrompt: '古代院门口双人对峙，横构图，自然光，画面中不要出现任何文字。',
        negativePrompt: 'modern clothes',
        referenceTaskImages: {
          characterRefs: [],
          sceneRefs: [],
          styleRefs: [],
          carryNotes: '',
        },
        assetReferences: {
          requiredCharacterRefs: ['程中安（娘）', '大山'],
          optionalEnvironmentRefs: ['老宅院门口'],
          continuityNotes: [],
        },
        assetCarryNotes: '优先携带人物参考图。',
        emotion: '坚定',
        location: '老宅院门口',
      },
    ],
    shotPromptPackage: {
      contractVersion: 'branch-image-story-v1',
      storyTitle: '测试标题',
      storyHook: '测试 hook',
      readingMode: 'vertical_comic',
      visualStyle: '情绪拉扯',
      globalCharacterConsistencyNotes: [],
      globalSceneConsistencyNotes: [],
      shots: [],
    },
  };
}

function buildReferenceAssets(): CollectedReferenceAssets {
  return {
    characterRefs: [
      {
        assetId: 'drama_001:chengzhongan-niang',
        assetType: 'character',
        assetPath: 'assets/reference/branch-characters/drama_001/chengzhongan-niang-three-view-v1.png',
        displayName: '程中安（娘）',
        usage: '人物造型与服装一致性',
        priority: 'required',
        source: 'local',
      },
      {
        assetId: 'drama_001:dashan',
        assetType: 'character',
        assetPath: 'assets/reference/branch-characters/drama_001/dashan-three-view-v1.png',
        displayName: '大山',
        usage: '人物造型与服装一致性',
        priority: 'required',
        source: 'local',
      },
    ],
    sceneRefs: [],
    styleRefs: [],
    carryNotes: '只参考角色三视图，保持脸型、发型、服装一致。',
  };
}

describe('applyReferenceAssetsToStoryboard', () => {
  it('hydrates shot referenceTaskImages from collected reference assets', () => {
    const result = applyReferenceAssetsToStoryboard(buildStoryboard(), buildReferenceAssets());

    expect(result.shots[0].referenceTaskImages.characterRefs).toHaveLength(2);
    expect(result.shots[0].referenceTaskImages.sceneRefs).toHaveLength(0);
    expect(result.shots[0].referenceTaskImages.characterRefs[0].source).toBe('local');
    expect(result.shots[0].referenceTaskImages.carryNotes).toBe('只参考角色三视图，保持脸型、发型、服装一致。');
    expect(result.shotPromptPackage.shots[0].referenceTaskImages.characterRefs).toHaveLength(2);
  });
});
