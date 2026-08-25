import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { publishOrderCreated } from '../messaging/publisher';

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'items must not be empty'),
});

const idSchema = z.string().uuid();

export function ordersRouter(pool: Pool): Router {
  const router = Router();

  router.post('/orders', async (req, res, next) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const id = uuidv4();
      const { items } = parsed.data;

      await pool.query(
        'INSERT INTO orders (id, items, status) VALUES ($1, $2, $3)',
        [id, JSON.stringify(items), 'pending']
      );

      await publishOrderCreated({ orderId: id, items });

      res.status(201).json({ id, items, status: 'pending' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/orders/:id', async (req, res, next) => {
    try {
      const idParsed = idSchema.safeParse(req.params.id);
      if (!idParsed.success) {
        return res.status(400).json({ error: 'invalid order id' });
      }

      const result = await pool.query('SELECT * FROM orders WHERE id = $1', [
        req.params.id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'order not found' });
      }

      const row = result.rows[0];
      res.status(200).json({
        id: row.id,
        items: row.items,
        status: row.status,
        createdAt: row.created_at,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
