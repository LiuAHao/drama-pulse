import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createImageClient } from '../../src/services/branchTask/imageClient.js';

describe('imageClient reference image support', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses image edit endpoint with multipart form when reference images are provided', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'branch-image-client-'));
    const refImagePath = path.join(tempDir, 'hero.png');
    await fs.writeFile(refImagePath, Buffer.from('fake-image'));

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(_input)).toBe('https://example.test/v1/images/edits');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toEqual({
        Authorization: 'Bearer test-key',
      });
      expect(init?.body).toBeInstanceOf(FormData);

      const form = init?.body as FormData;
      expect(form.get('model')).toBe('gpt-image-1');
      expect(form.get('prompt')).toBe('draw the branch finale');
      expect(form.get('size')).toBe('1024x576');
      expect(form.get('quality')).toBe('standard');

      const images = form.getAll('image');
      expect(images).toHaveLength(1);

      return new Response(JSON.stringify({
        data: [
          {
            b64_json: Buffer.from('png-binary').toString('base64'),
            revised_prompt: 'revised',
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = createImageClient({
      baseUrl: 'https://example.test',
      apiKey: 'test-key',
      model: 'gpt-image-1',
    });

    const result = await client.generateImage({
      prompt: 'draw the branch finale',
      referenceImagePaths: [refImagePath],
    });

    expect(result.revisedPrompt).toBe('revised');
    expect(result.url.startsWith('data:image/png;base64,')).toBe(true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
