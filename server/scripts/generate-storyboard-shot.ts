import * as dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyReferenceAssetsToStoryboard } from '../src/services/branchTask/assetCollector.js';
import { getBranchTaskImageEnv } from '../src/services/branchTask/env.js';
import { createImageClient } from '../src/services/branchTask/imageClient.js';
import type { ReferenceAssetItem, ShotPromptPackage, StoryboardResult } from '../src/services/branchTask/types.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

dotenv.config({ path: path.join(REPO_ROOT, '.env') });
dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

interface ArtifactShape {
  shotPromptJson: string;
  referenceAssetsJson?: string;
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) continue;
    args.set(key.slice(2), value);
    index += 1;
  }
  return args;
}

function ensureAbsolute(targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(REPO_ROOT, targetPath);
}

function decodeDataUrl(dataUrl: string): Buffer {
  const marker = 'base64,';
  const index = dataUrl.indexOf(marker);
  if (index === -1) {
    throw new Error('Invalid data URL image payload');
  }
  return Buffer.from(dataUrl.slice(index + marker.length), 'base64');
}

async function writeImage(outputPath: string, imageUrl: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (imageUrl.startsWith('data:image/')) {
    await fs.writeFile(outputPath, decodeDataUrl(imageUrl));
    return;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download generated image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

function hydrateStoryboardReferences(
  shotPromptPackage: ShotPromptPackage,
  referenceAssetsJson?: string,
): StoryboardResult {
  const storyboard: StoryboardResult = {
    shots: shotPromptPackage.shots,
    shotPromptPackage,
  };

  if (!referenceAssetsJson) {
    return storyboard;
  }

  const referenceAssets = JSON.parse(referenceAssetsJson) as {
    characterRefs: ReferenceAssetItem[];
    sceneRefs: ReferenceAssetItem[];
    styleRefs: ReferenceAssetItem[];
    carryNotes: string;
  };
  return applyReferenceAssetsToStoryboard(storyboard, referenceAssets);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifactArg = args.get('artifact');
  if (!artifactArg) {
    throw new Error('Usage: tsx server/scripts/generate-storyboard-shot.ts --artifact <artifact.json> [--scene 1] [--output <output.png>]');
  }

  const imageEnv = getBranchTaskImageEnv();
  if (!imageEnv) {
    throw new Error('Image generation env is not configured. Set BRANCH_TASK_ENABLE_IMAGE_GENERATION=1 and OPENAI_API_KEY.');
  }

  const artifactPath = ensureAbsolute(artifactArg);
  const scene = Number(args.get('scene') || '1');
  const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf-8')) as ArtifactShape;
  const shotPromptPackage = JSON.parse(artifact.shotPromptJson) as ShotPromptPackage;
  const storyboard = hydrateStoryboardReferences(shotPromptPackage, artifact.referenceAssetsJson);
  const shot = storyboard.shots.find((item) => item.scene === scene);

  if (!shot) {
    throw new Error(`Scene ${scene} not found in artifact`);
  }

  const outputPath = ensureAbsolute(
    args.get('output')
      || `assets/generated/manual-storyboard-tests/${path.basename(artifactPath, '.json')}-scene-${scene}.png`,
  );

  const client = createImageClient({
    apiKey: imageEnv.apiKey,
    baseUrl: imageEnv.baseUrl,
    model: imageEnv.model,
  });

  const referenceImagePaths = shot.referenceTaskImages.characterRefs
    .filter((item) => item.source === 'local')
    .map((item) => ensureAbsolute(item.assetPath));

  const result = await client.generateImage({
    prompt: shot.imagePrompt,
    referenceImagePaths,
  });

  await writeImage(outputPath, result.url);
  console.log(JSON.stringify({
    artifactPath,
    scene,
    outputPath,
    referenceCount: referenceImagePaths.length,
    revisedPrompt: result.revisedPrompt ?? '',
  }, null, 2));
}

await main();
