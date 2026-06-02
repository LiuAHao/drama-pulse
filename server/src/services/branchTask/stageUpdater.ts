import { prisma } from '../../shared/db/index.js';
import type { PipelineStage } from './types.js';

export async function updatePipelineStage(
  taskId: string,
  stage: PipelineStage,
): Promise<void> {
  await prisma.branchTask.update({
    where: { id: taskId },
    data: { pipelineStage: stage },
  });
}

export async function updateStageWithData(
  taskId: string,
  stage: PipelineStage,
  data: Record<string, unknown>,
): Promise<void> {
  await prisma.branchTask.update({
    where: { id: taskId },
    data: { pipelineStage: stage, ...data },
  });
}
