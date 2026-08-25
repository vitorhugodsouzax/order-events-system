import express, { Express } from 'express';
import { Pool } from 'pg';
import { notificationsRouter } from './routes/notifications';

export function createApp(pool: Pool): Express {
  const app = express();
  app.use(express.json());
  app.use(notificationsRouter(pool));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });
  return app;
}
