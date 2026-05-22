import { createApp } from '../../src/app/createApp.js';
import { FastifyInstance } from 'fastify';

export async function buildTestApp(): Promise<FastifyInstance> {
  process.env.ADMIN_TOKEN = 'test-admin-token';
  process.env.DATABASE_URL = 'file:../data/app.db';
  process.env.HOST = 'localhost';
  process.env.PORT = '8787';
  process.env.VIDEOS_ROOT = '../videos';
  process.env.ASSETS_ROOT = '../assets';
  process.env.EXPORTS_ROOT = '../data/exports';

  return createApp();
}

export const ADMIN_AUTH = { authorization: 'Bearer test-admin-token' };
