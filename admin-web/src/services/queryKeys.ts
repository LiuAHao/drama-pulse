export const queryKeys = {
  dramas: ['admin', 'dramas'] as const,
  episodes: (filters?: Record<string, string>) =>
    ['admin', 'episodes', filters] as const,
  highlights: (filters?: Record<string, string>) =>
    ['admin', 'highlights', filters] as const,
  highlightDetail: (id: string) => ['admin', 'highlight', id] as const,
  highlightReviewContext: (id: string) => ['admin', 'highlight-review', id] as const,
  interactions: (filters?: Record<string, string>) =>
    ['admin', 'interactions', filters] as const,
  favorites: (filters?: Record<string, string>) =>
    ['admin', 'favorites', filters] as const,
  playerComments: (filters?: Record<string, string>) =>
    ['admin', 'playerComments', filters] as const,
  danmaku: (filters?: Record<string, string>) =>
    ['admin', 'danmaku', filters] as const,
  watchProgress: (filters?: Record<string, string>) =>
    ['admin', 'watchProgress', filters] as const,
  branchTasks: (filters?: Record<string, string>) =>
    ['admin', 'branchTasks', filters] as const,
  branchTaskDetail: (taskId: string) =>
    ['admin', 'branchTask', taskId] as const,
};
