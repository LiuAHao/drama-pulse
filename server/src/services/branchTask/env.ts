import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

export const DEFAULT_ENV_FILES = [
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'server', '.env'),
];

export function loadEnvFiles(paths: string[] = DEFAULT_ENV_FILES): Record<string, string> {
  const env: Record<string, string> = {};
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [key, ...rest] = line.split('=');
      env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
    }
  }
  return env;
}

export interface BranchTaskImageEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getImageEnvValue(
  processEnv: NodeJS.ProcessEnv,
  fileEnv: Record<string, string>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = processEnv[key] || fileEnv[key] || '';
    if (value) {
      return value;
    }
  }
  return '';
}

export function getBranchTaskImageEnv(
  processEnv: NodeJS.ProcessEnv = process.env,
  fileEnv: Record<string, string> = loadEnvFiles(),
): BranchTaskImageEnv | null {
  const enabled = (processEnv.BRANCH_TASK_ENABLE_IMAGE_GENERATION || fileEnv.BRANCH_TASK_ENABLE_IMAGE_GENERATION || '') === '1';
  if (!enabled) {
    return null;
  }

  const apiKey = getImageEnvValue(processEnv, fileEnv, ['OPENAI_API_KEY', 'IMAGE_API_KEY']);
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: getImageEnvValue(processEnv, fileEnv, ['OPENAI_BASE_URL', 'IMAGE_BASE_URL']) || 'https://api.openai.com',
    model: getImageEnvValue(processEnv, fileEnv, ['BRANCH_TASK_IMAGE_MODEL', 'IMAGE_MODEL']) || 'gpt-image-1',
  };
}
