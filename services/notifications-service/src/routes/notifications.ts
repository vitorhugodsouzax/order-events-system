import { Router } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';

const idSchema = z.string().uuid();

export function notificationsRouter(pool: Pool): Router {
  const router = Router();

  router.get('/notifications/:orderId', async (req, res, next) => {
    try {
      const idParsed = idSchema.safeParse(req.params.orderId);
      if (!idParsed.success) {
        return res.status(400).json({ error: 'invalid order id' });
      }

      const result = await pool.query(
        'SELECT order_id, type, message, created_at FROM notifications WHERE order_id = $1 ORDER BY created_at',
        [req.params.orderId]
      );

      res.status(200).json(
        result.rows.map((row) => ({
          orderId: row.order_id,
          type: row.type,
          message: row.message,
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
