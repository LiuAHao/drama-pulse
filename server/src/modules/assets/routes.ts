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

    return reply.send(fs.createReadStream(filePath));
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
