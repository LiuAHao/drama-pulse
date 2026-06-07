import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { EpisodeContext, ReferenceAssetItem, ReferenceTaskImageSet, StoryExpansion, StoryboardResult } from './types.js';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

const CHARACTER_FILE_ALIASES: Record<string, Record<string, string[]>> = {
  drama_001: {
    '程中安（娘）': ['chengzhongan-niang'],
    '程中安': ['chengzhongan-niang'],
    '大山': ['dashan'],
    '二狗': ['ergou'],
    '三牛': ['sanniu'],
    '四蛋（四代）': ['sidan'],
    '四蛋': ['sidan'],
    '昭儿': ['zhaoer'],
    '程家舅母刘氏': ['chengjia-elder-woman'],
    '刘氏': ['chengjia-elder-woman'],
  },
};

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
  const aliasSlugs = CHARACTER_FILE_ALIASES[dramaId]?.[characterName] ?? [];
  const candidates = Array.from(new Set([
    slug,
    ...aliasSlugs,
  ])).flatMap((candidateSlug) => [
    `${candidateSlug}-three-view-v1.png`,
    `${candidateSlug}-three-view-v1.jpg`,
  ]);

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

function uniqueReferenceAssets(items: ReferenceAssetItem[]): ReferenceAssetItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.assetType}:${item.assetPath}:${item.displayName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeReferenceTaskImages(
  existing: ReferenceTaskImageSet,
  merged: Partial<ReferenceTaskImageSet>,
  fallbackCarryNotes: string,
): ReferenceTaskImageSet {
  return {
    characterRefs: uniqueReferenceAssets([
      ...(existing.characterRefs ?? []),
      ...(merged.characterRefs ?? []),
    ]),
    sceneRefs: uniqueReferenceAssets([
      ...(existing.sceneRefs ?? []),
      ...(merged.sceneRefs ?? []),
    ]),
    styleRefs: uniqueReferenceAssets([
      ...(existing.styleRefs ?? []),
      ...(merged.styleRefs ?? []),
    ]),
    carryNotes: existing.carryNotes || merged.carryNotes || fallbackCarryNotes,
  };
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

  return {
    characterRefs,
    sceneRefs: [],
    styleRefs: [],
    carryNotes: '只参考角色三视图，保持脸型、发型、服装一致。',
  };
}

export function applyReferenceAssetsToStoryboard(
  storyboard: StoryboardResult,
  referenceAssets: CollectedReferenceAssets,
): StoryboardResult {
  const characterRefMap = new Map(referenceAssets.characterRefs.map((item) => [item.displayName, item]));
  const shots = storyboard.shots.map((shot) => {
    const characterNames = Array.from(new Set([
      ...shot.requiredCharacters.map((character) => character.characterName),
      ...shot.assetReferences.requiredCharacterRefs,
    ].filter(Boolean)));
    const requiredCharacterRefs = uniqueReferenceAssets(
      characterNames
        .map((name) => characterRefMap.get(name))
        .filter((item): item is ReferenceAssetItem => Boolean(item)),
    );
    return {
      ...shot,
      referenceTaskImages: mergeReferenceTaskImages(
        shot.referenceTaskImages,
        {
          characterRefs: requiredCharacterRefs,
          sceneRefs: [],
          styleRefs: referenceAssets.styleRefs,
          carryNotes: referenceAssets.carryNotes,
        },
        shot.assetCarryNotes,
      ),
    };
  });

  return {
    shots,
    shotPromptPackage: {
      ...storyboard.shotPromptPackage,
      shots,
    },
  };
}
