const { test, expect } = require('playwright/test');

const ADMIN_BASE = 'http://localhost:5173';
const API_BASE = 'http://127.0.0.1:8787';
const ADMIN_TOKEN = 'replace-me';

async function seedRuntimeData(request) {
  const deviceId = 'admin-review-device';

  await request.put(`${API_BASE}/users/user_d47ccf57a0e0326f/favorites/drama_001`, {
    headers: { 'x-device-id': deviceId },
    data: { favorite: true, deviceId },
  });

  await request.post(`${API_BASE}/episodes/ep_001_01/comments`, {
    headers: { 'x-device-id': deviceId },
    data: { deviceId, content: '这段情绪拉得很满，评论区会有反应。' },
  });

  await request.post(`${API_BASE}/episodes/ep_001_01/danmaku`, {
    headers: { 'x-device-id': deviceId },
    data: { deviceId, content: '卧槽', triggerPositionMs: 18300 },
  });

  await request.post(`${API_BASE}/users/user_d47ccf57a0e0326f/watch-progress`, {
    headers: { 'x-device-id': deviceId },
    data: { deviceId, episodeId: 'ep_001_03', progressMs: 48200 },
  });

  const branchTaskRes = await request.post(`${API_BASE}/branch-tasks`, {
    data: { deviceId, episodeId: 'ep_001_23', userPrompt: '如果女主当场反击会怎样？' },
  });
  const branchTask = await branchTaskRes.json();
  const taskId = branchTask.data.id;

  await request.post(`${API_BASE}/branch-tasks/${taskId}/likes`, {
    data: { deviceId },
  });

  await request.post(`${API_BASE}/branch-tasks/${taskId}/comments`, {
    data: { deviceId, content: '这个分支标题和节奏都不错。' },
  });

  return { taskId };
}

test('capture admin review screens', async ({ page, request }) => {
  const { taskId } = await seedRuntimeData(request);

  await page.goto(`${ADMIN_BASE}/login`);
  await expect(page.getByText('管理后台登录')).toBeVisible();
  await page.screenshot({ path: 'tmp/admin-review-login.png', fullPage: true });

  await page.evaluate((token) => {
    localStorage.setItem('drama-pulse-admin-token', token);
  }, ADMIN_TOKEN);

  await page.goto(`${ADMIN_BASE}/dashboard`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('播放互动')).toBeVisible();
  await page.screenshot({ path: 'tmp/admin-review-dashboard.png', fullPage: true });

  await page.goto(`${ADMIN_BASE}/player-engagement`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('播放互动管理')).toBeVisible();
  await page.screenshot({ path: 'tmp/admin-review-player-engagement.png', fullPage: true });

  await page.goto(`${ADMIN_BASE}/branch-tasks`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: '分支任务' })).toBeVisible();
  await page.getByRole('button', { name: '详情' }).first().click();
  await expect(page.getByRole('heading', { name: '分支任务详情' })).toBeVisible();
  await page.screenshot({ path: 'tmp/admin-review-branch-detail.png', fullPage: true });

  await request.post(`${API_BASE}/admin/demo/reset`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
});
