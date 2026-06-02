import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { EpisodeContext, ReferenceAssetItem, StoryExpansion, StoryboardResult } from './types.js';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

function slugifyCharacterName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findCharacterReference(dramaId: string, characterName: string): Promise<ReferenceAssetItem | null> {
  const dir = path.join(REPO_ROOT, 'assets', 'reference', 'branch-characters', dramaId);
  const slug = slugifyCharacterName(characterName);
  const candidates = [
    `${slug}-three-view-v1.png`,
    `${slug}-three-view-v1.jpg`,
  ];

  for (const fileName of candidates) {
    const assetPath = path.join(dir, fileName);
    if (await fileExists(assetPath)) {
      const relativePath = path.relative(REPO_ROOT, assetPath).replace(/\\/g, '/');
      return {
        assetId: `${dramaId}:${slug}`,
        assetType: 'character',
        assetPath: relativePath,
        displayName: characterName,
        usage: '人物造型与服装一致性',
        priority: 'required',
        source: 'local',
      };
    }
  }

  return {
    assetId: `${dramaId}:${slug}`,
    assetType: 'character',
    assetPath: `assets/reference/branch-characters/${dramaId}/${slug}-three-view-v1.png`,
    displayName: characterName,
    usage: '待补齐的人物三视图参考路径',
    priority: 'required',
    source: 'inferred',
  };
}

function inferSceneReference(dramaId: string, sceneName: string): ReferenceAssetItem {
  const sceneSlug = slugifyCharacterName(sceneName || 'scene');
  return {
    assetId: `${dramaId}:scene:${sceneSlug}`,
    assetType: 'scene',
    assetPath: `assets/reference/branch-scenes/${dramaId}/${sceneSlug}.png`,
    displayName: sceneName || '关键场景',
    usage: '场景氛围与空间连续性',
    priority: 'recommended',
    source: 'inferred',
  };
}

export interface CollectedReferenceAssets {
  characterRefs: ReferenceAssetItem[];
  sceneRefs: ReferenceAssetItem[];
  styleRefs: ReferenceAssetItem[];
  carryNotes: string;
}

export async function collectReferenceAssets(
  context: EpisodeContext,
  story: StoryExpansion,
  storyboard: StoryboardResult,
): Promise<CollectedReferenceAssets> {
  const characterNames = Array.from(new Set([
    ...story.characterFocus,
    ...story.cast.filter((member) => member.required).map((member) => member.characterName),
    ...storyboard.shots.flatMap((shot) => shot.requiredCharacters.map((character) => character.characterName)),
  ])).filter(Boolean);

  const characterRefs = (await Promise.all(
    characterNames.map((name) => findCharacterReference(context.dramaId, name)),
  )).filter((item): item is ReferenceAssetItem => Boolean(item));

  const sceneNames = Array.from(new Set(storyboard.shots.map((shot) => shot.requiredScene || shot.location))).filter(Boolean);
  const sceneRefs = sceneNames.map((sceneName) => inferSceneReference(context.dramaId, sceneName));

  return {
    characterRefs,
    sceneRefs,
    styleRefs: [],
    carryNotes: '优先复用角色三视图；场景图不足时先记录为推断场景参考，后续再补真实资产。',
  };
}
