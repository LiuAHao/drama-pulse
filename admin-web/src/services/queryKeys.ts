export const queryKeys = {
  dramas: ['admin', 'dramas'] as const,
  episodes: (filters?: Record<string, string>) =>
    ['admin', 'episodes', filters] as const,
  highlights: (filters?: Record<string, string>) =>
    ['admin', 'highlights', filters] as const,
  interactions: (filters?: Record<string, string>) =>
    ['admin', 'interactions', filters] as const,
  branchTasks: (filters?: Record<string, string>) =>
    ['admin', 'branchTasks', filters] as const,
};
