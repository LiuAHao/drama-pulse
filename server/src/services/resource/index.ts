import fs from 'fs';
import path from 'path';
import type { FastifyRequest } from 'fastify';

export interface ResourceRoots {
  videosRoot: string;
  assetsRoot: string;
  exportsRoot: string;
}

export function getHost(): string {
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || '8787';
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  return `http://${displayHost}:${port}`;
}

export function getBaseUrlFromRequest(request: FastifyRequest): string {
  const protocol = (request.headers['x-forwarded-proto'] as string | undefined) || request.protocol || 'http';
  const host = (request.headers['x-forwarded-host'] as string | undefined) || request.headers.host;

  if (!host) {
    return getHost();
  }

  return `${protocol}://${host}`;
}

export function getProjectRoot(): string {
  return path.resolve(process.cwd(), process.env.STATIC_ROOT || '..');
}

export function getResourceConfigPath(): string {
  return path.join(getProjectRoot(), 'config', 'resource-paths.local.json');
}

export function getResourceRoots(): ResourceRoots {
  const configPath = getResourceConfigPath();
  const configDir = path.dirname(configPath);
  const defaults: ResourceRoots = {
    videosRoot: path.resolve(process.cwd(), process.env.VIDEOS_ROOT || '../videos'),
    assetsRoot: path.resolve(process.cwd(), process.env.ASSETS_ROOT || '../assets'),
    exportsRoot: path.resolve(process.cwd(), process.env.EXPORTS_ROOT || '../data/exports'),
  };

  try {
    const raw = fs.readFileSync(getResourceConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Record<keyof ResourceRoots, string>>;

    return {
      videosRoot: parsed.videosRoot ? path.resolve(configDir, parsed.videosRoot) : defaults.videosRoot,
      assetsRoot: parsed.assetsRoot ? path.resolve(configDir, parsed.assetsRoot) : defaults.assetsRoot,
      exportsRoot: parsed.exportsRoot ? path.resolve(configDir, parsed.exportsRoot) : defaults.exportsRoot,
    };
  } catch {
    return defaults;
  }
}

export function pathToUrl(filePath: string, baseUrl: string = getHost()): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;

  if (filePath.startsWith('videos/')) {
    return `${baseUrl}/static/videos/${filePath.slice('videos/'.length)}`;
  }
  if (filePath.startsWith('assets/')) {
    return `${baseUrl}/static/assets/${filePath.slice('assets/'.length)}`;
  }
  if (filePath.startsWith('data/exports/')) {
    return `${baseUrl}/static/exports/${filePath.slice('data/exports/'.length)}`;
  }

  return `${baseUrl}/static/${filePath}`;
}
