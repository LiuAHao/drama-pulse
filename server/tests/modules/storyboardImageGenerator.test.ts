import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { generateStoryboardImages } from '../../src/services/branchTask/storyboardImageGenerator.js';
import type { ImageClient } from '../../src/services/branchTask/imageClient.js';
import type { ShotPrompt } from '../../src/services/branchTask/types.js';

function buildShot(): ShotPrompt {
  return {
    scene: 1,
    sceneTitle: '分支起点',
    plotPurpose: '建立场景',
    description: '她回到院子门口。',
    narrationText: '她终于回到了院子门口。',
    narrationPlacement: 'below_image',
    dialogueText: '我回来了。',
    subtitleText: '我回来了。',
    requiredCharacters: [
      { characterName: '程中安（娘）', roleInShot: '主角', mustAppear: true },
    ],
    optionalCharacters: [],
    characterVisualNotes: '保持粗布衣和发型一致。',
    requiredScene: '老宅院门口',
    sceneVisualNotes: '黄昏土墙院落。',
    compositionNotes: '竖屏中心构图。',
    imagePrompt: '古代院门口人物回身，横构图，自然光，画面中不要出现任何文字。',
    negativePrompt: 'modern clothes',
    referenceTaskImages: {
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
      ],
      sceneRefs: [],
      styleRefs: [],
      carryNotes: '延续服装和表情。',
    },
    assetReferences: {
      requiredCharacterRefs: [],
      optionalEnvironmentRefs: [],
      continuityNotes: [],
    },
    assetCarryNotes: '延续上一镜头服装。',
    emotion: '坚定',
    location: '老宅院门口',
  };
}

describe('generateStoryboardImages', () => {
  it('passes local reference image paths to image client requests', async () => {
    const generateImage = vi.fn(async (request: any) => {
      expect(request.referenceImagePaths).toHaveLength(1);
      expect(request.referenceImagePaths[0]).toBe(
        path.resolve(
          '/Users/a0000/Desktop/项目文件/drama-pulse',
          'assets/reference/branch-characters/drama_001/chengzhongan-niang-three-view-v1.png',
        ),
      );
      return {
        url: 'https://example.com/generated.png',
      };
    });

    const imageClient = { generateImage } as unknown as ImageClient;

    const result = await generateStoryboardImages([buildShot()], imageClient);

    expect(result.status).toBe('success');
    expect(result.images[0].imageAssetPath).toBe('https://example.com/generated.png');
  });
});
