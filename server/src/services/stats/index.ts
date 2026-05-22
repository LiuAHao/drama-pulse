import { prisma } from '../../shared/db';

function heatLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 10) return 1;
  if (count <= 50) return 2;
  if (count <= 200) return 3;
  return 4;
}

export async function recalculateHighlightStats(highlightId: string): Promise<void> {
  const [totalCount, uniqueDevices, topOptionRow, lastEvent] = await Promise.all([
    prisma.interactionEvent.count({ where: { highlightId } }),
    prisma.interactionEvent.findMany({
      where: { highlightId },
      distinct: ['deviceId'],
      select: { deviceId: true },
    }),
    prisma.interactionEvent.groupBy({
      by: ['optionText'],
      where: { highlightId, optionText: { not: '' } },
      _count: { optionText: true },
      orderBy: { _count: { optionText: 'desc' } },
      take: 1,
    }),
    prisma.interactionEvent.findFirst({
      where: { highlightId },
      orderBy: { serverTimestamp: 'desc' },
      select: { serverTimestamp: true },
    }),
  ]);

  const uniqueDeviceCount = uniqueDevices.length;
  const topOption = topOptionRow.length > 0 ? topOptionRow[0].optionText : '';

  const allOptions = await prisma.interactionEvent.groupBy({
    by: ['optionText'],
    where: { highlightId, optionText: { not: '' } },
    _count: { optionText: true },
  });
  const optionStats: Record<string, number> = {};
  for (const row of allOptions) {
    optionStats[row.optionText] = row._count.optionText;
  }

  const recentEvents = await prisma.interactionEvent.findMany({
    where: { highlightId },
    orderBy: { serverTimestamp: 'desc' },
    take: 20,
    select: { optionText: true },
  });
  const recentTexts = recentEvents.map((e) => e.optionText).filter(Boolean);

  await prisma.highlightStats.upsert({
    where: { highlightId },
    create: {
      highlightId,
      totalCount,
      uniqueDeviceCount,
      heatLevel: heatLevel(totalCount),
      topOption,
      optionStatsJson: JSON.stringify(optionStats),
      recentTextsJson: JSON.stringify(recentTexts),
      lastEventAt: lastEvent?.serverTimestamp ?? null,
    },
    update: {
      totalCount,
      uniqueDeviceCount,
      heatLevel: heatLevel(totalCount),
      topOption,
      optionStatsJson: JSON.stringify(optionStats),
      recentTextsJson: JSON.stringify(recentTexts),
      lastEventAt: lastEvent?.serverTimestamp ?? null,
    },
  });
}

export async function getHighlightStats(highlightId: string) {
  const stats = await prisma.highlightStats.findUnique({
    where: { highlightId },
  });

  if (stats) return stats;

  return {
    highlightId,
    totalCount: 0,
    uniqueDeviceCount: 0,
    heatLevel: 0,
    topOption: '',
    optionStatsJson: '{}',
    recentTextsJson: '[]',
    lastEventAt: null,
    updatedAt: new Date(),
  };
}
