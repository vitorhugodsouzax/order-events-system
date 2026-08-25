import { createApp } from './app';
import { createPool, runMigrations } from './db';
import { startInventoryResultConsumer } from './messaging/consumer';

async function main() {
  const pool = createPool();
  await runMigrations(pool);
  await startInventoryResultConsumer(pool);

  const app = createApp(pool);
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`orders-service listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start orders-service', err);
  process.exit(1);
});
