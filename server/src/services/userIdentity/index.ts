import { createHash } from 'crypto';
import type { FastifyRequest } from 'fastify';
import { ValidationError } from '../../shared/errors/index.js';

export function getUserIdFromDeviceId(deviceId: string): string {
  return 'user_' + createHash('sha256').update(deviceId).digest('hex').slice(0, 16);
}

export function resolveDeviceId(request: FastifyRequest, bodyDeviceId?: string): string {
  const normalizedHeaderDeviceId = getHeaderDeviceId(request);

  if (normalizedHeaderDeviceId && bodyDeviceId && normalizedHeaderDeviceId !== bodyDeviceId) {
    throw new ValidationError('x-device-id does not match deviceId in body');
  }

  const resolved = normalizedHeaderDeviceId || bodyDeviceId;
  if (!resolved) {
    throw new ValidationError('deviceId is required');
  }

  return resolved;
}

export function getHeaderDeviceId(request: FastifyRequest): string | undefined {
  const headerDeviceId = request.headers['x-device-id'];
  return Array.isArray(headerDeviceId) ? headerDeviceId[0] : headerDeviceId;
}

export function requireUserMatchesRequestDeviceId(request: FastifyRequest, userId: string): string {
  const deviceId = getHeaderDeviceId(request);
  if (!deviceId) {
    throw new ValidationError('x-device-id is required');
  }
  return assertUserMatchesDeviceId(userId, deviceId);
}

export function assertUserMatchesDeviceId(userId: string, deviceId: string): string {
  const derivedUserId = getUserIdFromDeviceId(deviceId);
  if (userId !== derivedUserId) {
    throw new ValidationError('userId does not match deviceId');
  }

  return derivedUserId;
}
