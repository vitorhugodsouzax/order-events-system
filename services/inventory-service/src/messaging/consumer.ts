import { Pool } from 'pg';
import { getChannel, ORDER_EVENTS_EXCHANGE } from './connection';
import { publishInventoryResult } from './publisher';

interface OrderItem {
  productId: string;
  quantity: number;
}

export async function reserveStock(
  pool: Pool,
  items: OrderItem[]
): Promise<{ reserved: boolean; reason?: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const result = await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1',
        [item.quantity, item.productId]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        const check = await pool.query('SELECT stock FROM products WHERE id = $1', [
          item.productId,
        ]);
        const reason =
          check.rows.length === 0
            ? `product ${item.productId} not found`
            : `insufficient stock for ${item.productId}`;
        return { reserved: false, reason };
      }
    }

    await client.query('COMMIT');
    return { reserved: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function startOrderCreatedConsumer(pool: Pool): Promise<void> {
  const channel = await getChannel();
  await channel.prefetch(1);
  const queue = await channel.assertQueue('inventory.order-events', {
    durable: true,
  });

  await channel.bindQueue(queue.queue, ORDER_EVENTS_EXCHANGE, 'order.created');

  channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const result = await reserveStock(pool, event.payload.items);
      await publishInventoryResult(event.orderId, result.reserved, result.reason);
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to process order.created event', err);
      channel.nack(msg, false, false);
    }
  });
}
