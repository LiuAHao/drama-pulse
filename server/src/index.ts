import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createApp } from './app/createApp.js';
import { env } from './app/env.js';
import { startTaskQueue } from './services/taskQueue/index.js';

async function main() {
  const app = await createApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`server listening on ${env.HOST}:${env.PORT}`);

    startTaskQueue(app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
