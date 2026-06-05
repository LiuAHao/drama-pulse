import { loadEnvFiles } from './env.js';

interface ModelEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface JsonChatRequest {
  purpose: string;
  systemPrompt: string;
  userPrompt: string;
  modelEnvKeys?: string[];
  defaultModel?: string;
}

function getModelEnv(modelEnvKeys: string[] = [], defaultModel = 'deepseek-v4-flash'): ModelEnv {
  if (process.env.BRANCH_TASK_DISABLE_LLM === '1') {
    throw new Error('branch-task-llm-disabled');
  }

  const fileEnv = loadEnvFiles();
  const apiKey =
    process.env.DEEPSEEK_API_KEY ||
    fileEnv.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    fileEnv.OPENAI_API_KEY ||
    '';
  if (!apiKey) {
    throw new Error('branch-task-llm-missing-api-key');
  }

  let baseUrl = process.env.DEEPSEEK_BASE_URL || fileEnv.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  if (baseUrl === 'https://api.deepseek.com') {
    baseUrl = 'https://api.deepseek.com/v1';
  }

  let model = '';
  for (const key of [...modelEnvKeys, 'DEEPSEEK_BRANCH_TASK_MODEL', 'DEEPSEEK_MODEL']) {
    model = process.env[key] || fileEnv[key] || '';
    if (model) break;
  }

  return {
    apiKey,
    baseUrl,
    model: model || defaultModel,
  };
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const normalized = trimmed.startsWith('```')
    ? trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
    : trimmed;

  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('branch-task-llm-invalid-json');
    }
    return JSON.parse(normalized.slice(start, end + 1));
  }
}

export async function runJsonChat<T extends Record<string, unknown>>(request: JsonChatRequest): Promise<T> {
  const { apiKey, baseUrl, model } = getModelEnv(request.modelEnvKeys, request.defaultModel);
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`branch-task-llm-http-${response.status}: ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`branch-task-llm-empty-response: ${request.purpose}`);
  }

  return extractJsonObject(content) as T;
}
