import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { getResourceRoots } from '../../services/resource/index.js';

function ensureSafePath(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath);
  const normalizedRoot = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(normalizedRoot)) {
    throw new ValidationError('invalid static asset path');
  }

  return resolved;
}

export async function assetsRoutes(fastify: FastifyInstance) {
  fastify.get('/static/videos/*', async (request, reply) => {
    const relativePath = (request.params as { '*': string })['*'] || '';
    const { videosRoot } = getResourceRoots();
    const filePath = ensureSafePath(videosRoot, relativePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('static asset not found');
    }

    const stat = fs.statSync(filePath);
    const rangeHeader = request.headers.range;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' : 'application/octet-stream';

    reply.header('Accept-Ranges', 'bytes');
    reply.header('Content-Type', contentType);

    if (!rangeHeader) {
      reply.header('Content-Length', stat.size);
      return reply.send(fs.createReadStream(filePath));
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) {
      reply.code(416);
      reply.header('Content-Range', `bytes */${stat.size}`);
      return reply.send();
    }

    const start = match[1] === '' ? 0 : Number.parseInt(match[1], 10);
    const end = match[2] === '' ? stat.size - 1 : Number.parseInt(match[2], 10);

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end < start ||
      start >= stat.size
    ) {
      reply.code(416);
      reply.header('Content-Range', `bytes */${stat.size}`);
      return reply.send();
    }

    const safeEnd = Math.min(end, stat.size - 1);
    const chunkSize = safeEnd - start + 1;

    reply.code(206);
    reply.header('Content-Range', `bytes ${start}-${safeEnd}/${stat.size}`);
    reply.header('Content-Length', chunkSize);
    return reply.send(fs.createReadStream(filePath, { start, end: safeEnd }));
  });

  fastify.get('/static/assets/*', async (request, reply) => {
    const relativePath = (request.params as { '*': string })['*'] || '';
    const { assetsRoot } = getResourceRoots();
    const filePath = ensureSafePath(assetsRoot, relativePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('static asset not found');
    }

    return reply.send(fs.createReadStream(filePath));
  });

  fastify.get('/static/exports/*', async (request, reply) => {
    const relativePath = (request.params as { '*': string })['*'] || '';
    const { exportsRoot } = getResourceRoots();
    const filePath = ensureSafePath(exportsRoot, relativePath);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('static asset not found');
    }

    return reply.send(fs.createReadStream(filePath));
  });
}
