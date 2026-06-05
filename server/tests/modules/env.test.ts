import { describe, expect, it } from 'vitest';
import { getBranchTaskImageEnv } from '../../src/services/branchTask/env.js';

describe('getBranchTaskImageEnv', () => {
  it('supports IMAGE_* aliases for image generation env', () => {
    const result = getBranchTaskImageEnv(
      {
        BRANCH_TASK_ENABLE_IMAGE_GENERATION: '1',
        IMAGE_API_KEY: 'test-image-key',
        IMAGE_BASE_URL: 'https://image.example.com',
        IMAGE_MODEL: 'image-model-v1',
      },
      {},
    );

    expect(result).toEqual({
      apiKey: 'test-image-key',
      baseUrl: 'https://image.example.com',
      model: 'image-model-v1',
    });
  });

  it('prefers OPENAI_* and branch model envs when both are present', () => {
    const result = getBranchTaskImageEnv(
      {
        BRANCH_TASK_ENABLE_IMAGE_GENERATION: '1',
        OPENAI_API_KEY: 'openai-key',
        IMAGE_API_KEY: 'image-key',
        OPENAI_BASE_URL: 'https://openai.example.com',
        IMAGE_BASE_URL: 'https://image.example.com',
        BRANCH_TASK_IMAGE_MODEL: 'branch-model',
        IMAGE_MODEL: 'image-model',
      },
      {},
    );

    expect(result).toEqual({
      apiKey: 'openai-key',
      baseUrl: 'https://openai.example.com',
      model: 'branch-model',
    });
  });
});
