import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export interface StoryContextPackage {
  version?: string;
  generatedAt?: string;
  seriesOverview?: {
    seriesPremise?: string;
    mainConflict?: string;
    canonConstraints?: string[];
  };
  tailStateSnapshot?: {
    currentConflict?: string;
    unresolvedQuestions?: string[];
    branchEntryPoints?: string[];
    hardConstraints?: string[];
  };
  characterBible?: Array<Record<string, unknown>>;
  canonConstraints?: string[];
}

export interface StoryContextAttachment {
  storyContextVersion: string;
  storyContextAssetPath: string;
  storyContextPackage: StoryContextPackage | null;
  tailStateSnapshot: StoryContextPackage['tailStateSnapshot'] | null;
}

function resolveStoryContextPath(dramaId: string): string {
  return path.join(
    REPO_ROOT,
    'artifacts',
    'story_context',
    dramaId,
    'package',
    'story_context_package.json',
  );
}

export async function loadStoryContextForDrama(dramaId: string): Promise<StoryContextAttachment | null> {
  const assetPath = resolveStoryContextPath(dramaId);
  try {
    const raw = await fs.readFile(assetPath, 'utf-8');
    const payload = JSON.parse(raw) as StoryContextPackage;
    return {
      storyContextVersion: payload.version ?? '',
      storyContextAssetPath: assetPath,
      storyContextPackage: payload,
      tailStateSnapshot: payload.tailStateSnapshot ?? null,
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
