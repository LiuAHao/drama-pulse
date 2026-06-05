import fs from 'node:fs/promises';
import path from 'node:path';

export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  quality?: string;
  n?: number;
  referenceImagePaths?: string[];
}

export interface ImageGenerationResponse {
  url: string;
  revisedPrompt?: string;
}

export interface ImageClientConfig {
  baseUrl: string;
  apiKey: string;
  model?: string;
  defaultSize?: string;
  defaultQuality?: string;
}

const DEFAULT_CONFIG: Partial<ImageClientConfig> = {
  model: 'dall-e-3',
  defaultSize: '1024x576',
  defaultQuality: 'standard',
};

export function createImageClient(config: ImageClientConfig) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  async function generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    const hasReferenceImages = Array.isArray(request.referenceImagePaths) && request.referenceImagePaths.length > 0;

    if (hasReferenceImages) {
      const form = new FormData();
      form.append('model', merged.model ?? DEFAULT_CONFIG.model ?? 'gpt-image-1');
      form.append('prompt', request.prompt);
      form.append('size', request.size ?? merged.defaultSize ?? '1024x576');
      form.append('quality', request.quality ?? merged.defaultQuality ?? 'standard');
      form.append('n', String(request.n ?? 1));

      for (const referenceImagePath of request.referenceImagePaths ?? []) {
        const fileBuffer = await fs.readFile(referenceImagePath);
        const fileName = path.basename(referenceImagePath);
        const file = new File([fileBuffer], fileName, {
          type: inferImageMimeType(referenceImagePath),
        });
        form.append('image', file);
      }

      const res = await fetch(`${merged.baseUrl}/v1/images/edits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merged.apiKey}`,
        },
        body: form,
      });

      return normalizeImageResponse(res);
    }

    const body = {
      model: merged.model,
      prompt: request.prompt,
      size: request.size ?? merged.defaultSize,
      quality: request.quality ?? merged.defaultQuality,
      n: request.n ?? 1,
    };

    const res = await fetch(`${merged.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merged.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    return normalizeImageResponse(res);
  }

  return { generateImage };
}

function inferImageMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function normalizeImageResponse(res: Response): Promise<ImageGenerationResponse> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Image API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };

  const first = json.data?.[0];
  if (!first) {
    throw new Error('Image API returned no data');
  }

  if (first.url) {
    return {
      url: first.url,
      revisedPrompt: first.revised_prompt,
    };
  }

  if (first.b64_json) {
    return {
      url: `data:image/png;base64,${first.b64_json}`,
      revisedPrompt: first.revised_prompt,
    };
  }

  throw new Error('Image API returned no usable image payload');
}

export type ImageClient = ReturnType<typeof createImageClient>;
