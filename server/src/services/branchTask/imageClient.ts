export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  quality?: string;
  n?: number;
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

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Image API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      data: Array<{ url: string; revised_prompt?: string }>;
    };

    if (!json.data?.[0]?.url) {
      throw new Error('Image API returned no data');
    }

    return {
      url: json.data[0].url,
      revisedPrompt: json.data[0].revised_prompt,
    };
  }

  return { generateImage };
}

export type ImageClient = ReturnType<typeof createImageClient>;
