export const env = {
  PORT: parseInt(process.env.PORT || '8787', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'file:../data/app.db',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'replace-me',
  STATIC_ROOT: process.env.STATIC_ROOT || '..',
  VIDEOS_ROOT: process.env.VIDEOS_ROOT || '../videos',
  ASSETS_ROOT: process.env.ASSETS_ROOT || '../assets',
  EXPORTS_ROOT: process.env.EXPORTS_ROOT || '../data/exports',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
};
