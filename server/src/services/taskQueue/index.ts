import { prisma } from '../../shared/db';
import type { BranchTask } from '@prisma/client';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let taskProcessorTimeoutMs = 15000;

type GeneratedTaskResult = {
  resultTitle: string;
  resultHook: string;
  resultStory: string;
  storyboardJson: string;
  resultTagsJson: string;
  resultInteractionOptionsJson: string;
};

type TaskGenerator = (task: BranchTask) => Promise<GeneratedTaskResult>;

const defaultTaskGenerator: TaskGenerator = async (task: BranchTask) => {
  await new Promise((r) => setTimeout(r, 500));
  return {
    resultTitle: `AI Story for ${task.episodeId}`,
    resultHook: 'When the unexpected happens, everything changes...',
    resultStory: 'A short AI-generated story based on: ' + (task.userPrompt || 'default prompt'),
    storyboardJson: JSON.stringify([
      { scene: 1, description: 'Opening scene', duration: 5 },
      { scene: 2, description: 'Conflict arises', duration: 8 },
      { scene: 3, description: 'Resolution', duration: 6 },
    ]),
    resultTagsJson: JSON.stringify(['ai-generated', 'short']),
    resultInteractionOptionsJson: JSON.stringify([
      { text: 'Like this story', action: 'like' },
      { text: 'Share', action: 'share' },
    ]),
  };
};

let taskGenerator: TaskGenerator = defaultTaskGenerator;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`task timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function processTask(task: BranchTask): Promise<void> {
  await prisma.branchTask.update({
    where: { id: task.id },
    data: { status: 'running', startedAt: new Date() },
  });

  try {
    const result = await withTimeout(taskGenerator(task), taskProcessorTimeoutMs);
    await prisma.branchTask.update({
      where: { id: task.id },
      data: {
        status: 'success',
        resultTitle: result.resultTitle,
        resultHook: result.resultHook,
        resultStory: result.resultStory,
        storyboardJson: result.storyboardJson,
        resultTagsJson: result.resultTagsJson,
        resultInteractionOptionsJson: result.resultInteractionOptionsJson,
        resultSource: 'llm',
        finishedAt: new Date(),
      },
    });
  } catch (err: any) {
    const isTimeoutError = typeof err?.message === 'string' && err.message.includes('timed out');
    await prisma.branchTask.update({
      where: { id: task.id },
      data: {
        status: isTimeoutError ? 'timeout' : 'failed',
        failReason: err?.message || 'Unknown error',
        finishedAt: new Date(),
      },
    });
  }
}

async function poll(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const task = await prisma.branchTask.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    if (task) {
      await processTask(task);
    }
  } catch (err) {
    console.error('[taskQueue] poll error:', err);
  } finally {
    running = false;
  }
}

export function startTaskQueue(_log?: any): void {
  if (timer) return;
  console.log('[taskQueue] started');
  timer = setInterval(poll, 5000);
  poll();
}

export function stopTaskQueue(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[taskQueue] stopped');
  }
}

export function setTaskProcessorGenerator(generator: TaskGenerator): void {
  taskGenerator = generator;
}

export function setTaskProcessorTimeoutMs(timeoutMs: number): void {
  taskProcessorTimeoutMs = timeoutMs;
}

export function resetTaskProcessorConfig(): void {
  taskGenerator = defaultTaskGenerator;
  taskProcessorTimeoutMs = 15000;
}
