import { prisma } from '../../shared/db';
import type { BranchTask } from '@prisma/client';
import { execute as executeBranchTask } from '../branchTask/branchTaskExecutor.js';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

type TaskProcessor = (task: BranchTask) => Promise<void>;

let taskProcessor: TaskProcessor | null = null;

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
  if (taskProcessor) {
    await taskProcessor(task);
    return;
  }
  await executeBranchTask(task);
}

/** Override the task processor (used by tests). Pass null to reset. */
export function setTaskProcessor(processor: TaskProcessor | null): void {
  taskProcessor = processor;
}

/** @deprecated Use setTaskProcessor instead */
export function setTaskProcessorGenerator(generator: (task: BranchTask) => Promise<any>): void {
  taskProcessor = async (task: BranchTask) => {
    await prisma.branchTask.update({
      where: { id: task.id },
      data: { status: 'running', startedAt: new Date() },
    });
    try {
      const result = await withTimeout(generator(task), taskProcessorTimeoutMs);
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
          resultSource: 'doubao',
          pipelineStage: 'completed',
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
  };
}

let taskProcessorTimeoutMs = 15000;

export function setTaskProcessorTimeoutMs(timeoutMs: number): void {
  taskProcessorTimeoutMs = timeoutMs;
}

export function resetTaskProcessorConfig(): void {
  taskProcessor = null;
  taskProcessorTimeoutMs = 15000;
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

