import { createApp } from './app';
import { createPool, runMigrations } from './db';
import { startOrderCreatedConsumer } from './messaging/consumer';

async function main() {
  const pool = createPool();
  await runMigrations(pool);
  await startOrderCreatedConsumer(pool);

  const app = createApp(pool);
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`inventory-service listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start inventory-service', err);
  process.exit(1);
});
