import { createApp } from './app';
import { createPool, runMigrations } from './db';
import { startInventoryResultConsumer } from './messaging/consumer';

async function main() {
  const pool = createPool();
  await runMigrations(pool);
  await startInventoryResultConsumer(pool);

  const app = createApp(pool);
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`notifications-service listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start notifications-service', err);
  process.exit(1);
});
