import { Router } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';

const createProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  stock: z.number().int().nonnegative(),
});

export function productsRouter(pool: Pool): Router {
  const router = Router();

  router.post('/products', async (req, res) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { id, name, stock } = parsed.data;
    await pool.query(
      'INSERT INTO products (id, name, stock) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, stock = $3',
      [id, name, stock]
    );

    res.status(201).json({ id, name, stock });
  });

  router.get('/products', async (_req, res) => {
    const result = await pool.query('SELECT id, name, stock FROM products ORDER BY id');
    res.status(200).json(result.rows);
  });

  return router;
}
