import express, { Express } from 'express';
import { Pool } from 'pg';
import { productsRouter } from './routes/products';

export function createApp(pool: Pool): Express {
  const app = express();
  app.use(express.json());
  app.use(productsRouter(pool));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });
  return app;
}
