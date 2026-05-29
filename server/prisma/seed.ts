import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'url';

export async function seedDatabase(prisma: PrismaClient) {
  console.log('seeding database...');

  // Clean existing data
  await prisma.danmakuMessage.deleteMany();
  await prisma.playerComment.deleteMany();
  await prisma.favoriteDrama.deleteMany();
  await prisma.branchLike.deleteMany();
  await prisma.branchComment.deleteMany();
  await prisma.branchTask.deleteMany();
  await prisma.branchOption.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.watchProgress.deleteMany();
  await prisma.interactionEvent.deleteMany();
  await prisma.highlightStats.deleteMany();
  await prisma.highlight.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.drama.deleteMany();

  // Drama 1: 荒年全村啃树皮，我有系统满仓肉 (featured)
  const drama1 = await prisma.drama.create({
    data: {
      id: 'drama_001',
      title: '荒年全村啃树皮，我有系统满仓肉',
      description: '穿越到荒年，绑定系统后开启逆袭人生，从啃树皮到满仓肉的爽文故事。',
      coverPath: 'assets/dramas/covers/drama_001.png',
      tagsJson: JSON.stringify(['爽文', '穿越', '系统', '逆袭']),
      mainGenre: '爽文',
      isFeatured: true,
      displayOrder: 1,
      status: 'active',
    },
  });

  // Drama 2: 撕夜 (alternative)
  const drama2 = await prisma.drama.create({
    data: {
      id: 'drama_002',
      title: '撕夜',
      description: '都市情感剧，讲述年轻人在城市中经历的爱情与成长。',
      coverPath: 'assets/dramas/covers/drama_002.png',
      tagsJson: JSON.stringify(['情感', '都市', '爱情']),
      mainGenre: '情感',
      isFeatured: false,
      displayOrder: 2,
      status: 'active',
    },
  });

  // Episodes for Drama 1
  const episodes1 = [];
  for (let i = 1; i <= 23; i++) {
    const ep = await prisma.episode.create({
      data: {
        id: `ep_001_${String(i).padStart(2, '0')}`,
        dramaId: drama1.id,
        episodeNo: i,
        title: `第${i}集`,
        videoPath: `videos/荒年全村啃树皮，我有系统满仓肉/第${i}集.mp4`,
        durationMs: 180000 + Math.floor(Math.random() * 120000),
        summary: i === 1 ? '主角穿越到荒年，绑定系统，开始逆袭之路。' : '',
        isFinalEpisode: i === 23,
        hasBranch: i === 23,
        status: 'active',
      },
    });
    episodes1.push(ep);
  }

  // Episodes for Drama 2
  const episodes2 = [];
  for (let i = 1; i <= 23; i++) {
    const ep = await prisma.episode.create({
      data: {
        id: `ep_002_${String(i).padStart(2, '0')}`,
        dramaId: drama2.id,
        episodeNo: i,
        title: `第${i}集`,
        videoPath: `videos/撕夜/第${i}集.mp4`,
        durationMs: 180000 + Math.floor(Math.random() * 120000),
        summary: i === 1 ? '故事开始，主角初入城市。' : '',
        isFinalEpisode: i === 23,
        hasBranch: i === 23,
        status: 'active',
      },
    });
    episodes2.push(ep);
  }

  // Highlights for Drama 1 Episode 1
  const hl1 = await prisma.highlight.create({
    data: {
      id: 'hl_001_01',
      episodeId: episodes1[0].id,
      startTimeMs: 15000,
      endTimeMs: 25000,
      interactionStartMs: 15000,
      interactionAppearMs: 15600,
      interactionEndMs: 26500,
      type: 'feel_good',
      title: '系统绑定成功',
      description: '主角成功绑定系统，开启逆袭之路。',
      intensity: 4,
      templateId: 'emotion_button',
      interactionOptionsJson: JSON.stringify(['太爽了', '继续', '666']),
      visualEffectType: 'burst',
      source: 'manual',
      confidence: 0.95,
      status: 'confirmed',
    },
  });

  const hl2 = await prisma.highlight.create({
    data: {
      id: 'hl_001_02',
      episodeId: episodes1[0].id,
      startTimeMs: 60000,
      endTimeMs: 70000,
      interactionStartMs: 60000,
      interactionAppearMs: 60700,
      interactionEndMs: 71500,
      type: 'reversal',
      title: '村民震惊',
      description: '村民看到主角的变化，震惊不已。',
      intensity: 3,
      templateId: 'vote_side',
      interactionOptionsJson: JSON.stringify(['太厉害了', '这才刚开始']),
      visualEffectType: 'glow',
      source: 'manual',
      confidence: 0.9,
      status: 'confirmed',
    },
  });

  const hl3 = await prisma.highlight.create({
    data: {
      id: 'hl_001_03',
      episodeId: episodes1[0].id,
      startTimeMs: 120000,
      endTimeMs: 130000,
      interactionStartMs: 120000,
      interactionAppearMs: 120900,
      interactionEndMs: 131500,
      type: 'suspense',
      title: '危机出现',
      description: '新的危机降临，主角将如何应对？',
      intensity: 5,
      templateId: 'suspense_lock',
      interactionOptionsJson: JSON.stringify(['快跑', '正面刚']),
      visualEffectType: 'shake',
      source: 'manual',
      confidence: 0.85,
      status: 'confirmed',
    },
  });

  // Highlight with candidate status (should not appear on client)
  await prisma.highlight.create({
    data: {
      id: 'hl_001_04',
      episodeId: episodes1[0].id,
      startTimeMs: 150000,
      endTimeMs: 160000,
      interactionStartMs: 150000,
      interactionAppearMs: 150600,
      interactionEndMs: 161500,
      type: 'suspense',
      title: '示例占位高光',
      description: '用于演示的占位高光，默认不进入待复核列表。',
      intensity: 2,
      templateId: 'suspense_lock',
      interactionOptionsJson: JSON.stringify(['哈哈']),
      visualEffectType: 'sticker',
      source: 'ai',
      confidence: 0.6,
      status: 'disabled',
    },
  });

  // Highlights for Drama 1 Episode 2
  await prisma.highlight.create({
    data: {
      id: 'hl_002_01',
      episodeId: episodes1[1].id,
      startTimeMs: 20000,
      endTimeMs: 30000,
      interactionStartMs: 20000,
      interactionAppearMs: 20600,
      interactionEndMs: 31500,
      type: 'sweet',
      title: '温馨时刻',
      description: '主角与村民分享食物。',
      intensity: 3,
      templateId: 'boost_action',
      interactionOptionsJson: JSON.stringify(['暖心', '加油']),
      visualEffectType: 'glow',
      source: 'manual',
      confidence: 0.9,
      status: 'confirmed',
    },
  });

  // Initialize HighlightStats for confirmed highlights
  for (const hl of [hl1, hl2, hl3]) {
    await prisma.highlightStats.create({
      data: {
        highlightId: hl.id,
        totalCount: 0,
        uniqueDeviceCount: 0,
        heatLevel: 0,
        topOption: '',
        optionStatsJson: '{}',
        recentTextsJson: '[]',
      },
    });
  }

  // BranchOptions for Drama 1 final episode
  await prisma.branchOption.create({
    data: {
      id: 'bo_001_01',
      episodeId: episodes1[22].id,
      title: '回归现实',
      description: '主角选择关闭系统，带着收获回归现实生活。',
      resultType: 'video',
      resultContentPath: 'assets/dramas/branches/ep_001_23/bo_001_01.mp4',
      coverPath: 'assets/dramas/covers/bo_001_01.jpg',
      sortIndex: 1,
      status: 'active',
    },
  });

  await prisma.branchOption.create({
    data: {
      id: 'bo_001_02',
      episodeId: episodes1[22].id,
      title: '继续进化',
      description: '主角选择继续使用系统，探索更大的世界。',
      resultType: 'video',
      resultContentPath: 'assets/dramas/branches/ep_001_23/bo_001_02.mp4',
      coverPath: 'assets/dramas/covers/bo_001_02.jpg',
      sortIndex: 2,
      status: 'active',
    },
  });

  // BranchOptions for Drama 2 final episode
  await prisma.branchOption.create({
    data: {
      id: 'bo_002_01',
      episodeId: episodes2[22].id,
      title: '重新开始',
      description: '主角决定放下过去，重新开始新生活。',
      resultType: 'video',
      resultContentPath: 'assets/dramas/branches/ep_002_23/bo_002_01.mp4',
      coverPath: 'assets/dramas/covers/bo_002_01.jpg',
      sortIndex: 1,
      status: 'active',
    },
  });

  await prisma.branchOption.create({
    data: {
      id: 'bo_002_02',
      episodeId: episodes2[22].id,
      title: '坚守爱情',
      description: '主角选择坚守爱情，面对一切困难。',
      resultType: 'video',
      resultContentPath: 'assets/dramas/branches/ep_002_23/bo_002_02.mp4',
      coverPath: 'assets/dramas/covers/bo_002_02.jpg',
      sortIndex: 2,
      status: 'active',
    },
  });

  console.log('seed completed successfully');
  console.log(`  dramas: 2`);
  console.log(`  episodes: ${episodes1.length + episodes2.length}`);
  console.log(`  highlights: 5 (4 confirmed, 1 candidate)`);
  console.log(`  branch options: 4`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('seed failed:', e);
    process.exit(1);
  });
}
