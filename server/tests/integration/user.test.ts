import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../helpers/app.js';
import { getUserIdFromDeviceId } from '../../src/services/userIdentity/index.js';

describe('GET /users/:userId/profile', () => {
  const deviceId = 'device-profile-test';
  const userId = getUserIdFromDeviceId(deviceId);

  it('should return a default profile when none exists', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/profile`,
      headers: { 'x-device-id': deviceId },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.userId).toBe(userId);
    expect(body.data.nickname).toContain('剧迷用户');
    expect(typeof body.data.bio).toBe('string');

    await app.close();
  });

  it('should save and return profile data', async () => {
    const app = await buildTestApp();

    const updateRes = await app.inject({
      method: 'PUT',
      url: `/users/${userId}/profile`,
      headers: { 'x-device-id': deviceId },
      payload: {
        nickname: '阿浩',
        bio: '专看反转和笑点',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().data.nickname).toBe('阿浩');
    expect(updateRes.json().data.bio).toBe('专看反转和笑点');

    const fetchRes = await app.inject({
      method: 'GET',
      url: `/users/${userId}/profile`,
      headers: { 'x-device-id': deviceId },
    });

    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.json().data.nickname).toBe('阿浩');
    expect(fetchRes.json().data.bio).toBe('专看反转和笑点');

    await app.close();
  });

  it('should reject mismatched device identity when updating profile', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'PUT',
      url: `/users/${userId}/profile`,
      headers: { 'x-device-id': 'another-device' },
      payload: {
        nickname: '阿浩',
        bio: '专看反转和笑点',
      },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('should reject profile fetch without device identity', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/profile`,
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('should persist favorites for the same user', async () => {
    const app = await buildTestApp();

    const favoriteRes = await app.inject({
      method: 'PUT',
      url: `/users/${userId}/favorites/drama_001`,
      headers: { 'x-device-id': deviceId },
      payload: {
        favorite: true,
        deviceId,
      },
    });

    expect(favoriteRes.statusCode).toBe(200);
    expect(favoriteRes.json().data.favorite).toBe(true);
    expect(favoriteRes.json().data.favoriteCount).toBe(1);

    const listRes = await app.inject({
      method: 'GET',
      url: `/users/${userId}/favorites`,
      headers: { host: '192.168.1.88:8787', 'x-device-id': deviceId },
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data.dramaIds).toContain('drama_001');
    expect(listRes.json().data.dramas[0].id).toBe('drama_001');
    expect(listRes.json().data.dramas[0].coverPath).toContain('http://192.168.1.88:8787/');

    const unfavoriteRes = await app.inject({
      method: 'PUT',
      url: `/users/${userId}/favorites/drama_001`,
      headers: { 'x-device-id': deviceId },
      payload: {
        favorite: false,
        deviceId,
      },
    });

    expect(unfavoriteRes.statusCode).toBe(200);
    expect(unfavoriteRes.json().data.favorite).toBe(false);
    expect(unfavoriteRes.json().data.favoriteCount).toBe(0);

    await app.close();
  });

  it('should reject favorites fetch without device identity', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/favorites`,
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('should persist player comments by episode', async () => {
    const app = await buildTestApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/episodes/ep_001_01/comments',
      headers: { 'x-device-id': deviceId },
      payload: {
        deviceId,
        content: '这个点太上头了',
      },
    });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.json().data.content).toBe('这个点太上头了');

    const listRes = await app.inject({
      method: 'GET',
      url: '/episodes/ep_001_01/comments',
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data[0].content).toBe('这个点太上头了');

    await app.close();
  });

  it('should paginate player comments and expose paging headers', async () => {
    const app = await buildTestApp();

    for (const content of ['评论A', '评论B', '评论C']) {
      await app.inject({
        method: 'POST',
        url: '/episodes/ep_001_01/comments',
        headers: { 'x-device-id': deviceId },
        payload: { deviceId, content },
      });
    }

    const pagedRes = await app.inject({
      method: 'GET',
      url: '/episodes/ep_001_01/comments?page=2&pageSize=1',
    });

    expect(pagedRes.statusCode).toBe(200);
    expect(pagedRes.headers['x-total-count']).toBe('3');
    expect(pagedRes.headers['x-page']).toBe('2');
    expect(pagedRes.headers['x-page-size']).toBe('1');
    expect(pagedRes.headers['x-total-pages']).toBe('3');
    expect(pagedRes.json().data).toHaveLength(1);

    await app.close();
  });

  it('should reject overlong player comments', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/episodes/ep_001_01/comments',
      headers: { 'x-device-id': deviceId },
      payload: {
        deviceId,
        content: 'a'.repeat(201),
      },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('should persist danmaku messages by episode', async () => {
    const app = await buildTestApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/episodes/ep_001_01/danmaku',
      headers: { 'x-device-id': deviceId },
      payload: {
        deviceId,
        content: '前方高能',
        triggerPositionMs: 32000,
      },
    });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.json().data.content).toBe('前方高能');
    expect(createRes.json().data.triggerPositionMs).toBe(32000);

    const listRes = await app.inject({
      method: 'GET',
      url: '/episodes/ep_001_01/danmaku',
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().data[0].content).toBe('前方高能');

    await app.close();
  });

  it('should paginate danmaku and expose paging headers', async () => {
    const app = await buildTestApp();

    for (const content of ['弹幕A', '弹幕B', '弹幕C']) {
      await app.inject({
        method: 'POST',
        url: '/episodes/ep_001_01/danmaku',
        headers: { 'x-device-id': deviceId },
        payload: { deviceId, content, triggerPositionMs: 12000 },
      });
    }

    const pagedRes = await app.inject({
      method: 'GET',
      url: '/episodes/ep_001_01/danmaku?page=2&pageSize=1',
    });

    expect(pagedRes.statusCode).toBe(200);
    expect(pagedRes.headers['x-total-count']).toBe('3');
    expect(pagedRes.headers['x-page']).toBe('2');
    expect(pagedRes.headers['x-page-size']).toBe('1');
    expect(pagedRes.headers['x-total-pages']).toBe('3');
    expect(pagedRes.json().data).toHaveLength(1);

    await app.close();
  });

  it('should reject overlong danmaku', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/episodes/ep_001_01/danmaku',
      headers: { 'x-device-id': deviceId },
      payload: {
        deviceId,
        content: '弹'.repeat(81),
        triggerPositionMs: 32000,
      },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });
});
