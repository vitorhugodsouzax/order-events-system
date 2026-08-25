import { Pool } from 'pg';
import { getChannel, ORDER_EVENTS_EXCHANGE } from './connection';

export async function recordNotification(
  pool: Pool,
  orderId: string,
  type: string,
  payload: { reason?: string }
): Promise<void> {
  const message =
    type === 'inventory.reserved'
      ? `Order ${orderId} confirmed — stock reserved successfully.`
      : `Order ${orderId} rejected — ${payload.reason || 'unknown reason'}.`;

  console.log(`[notification] ${message}`);

  await pool.query(
    'INSERT INTO notifications (order_id, type, message) VALUES ($1, $2, $3)',
    [orderId, type, message]
  );
}

export async function startInventoryResultConsumer(pool: Pool): Promise<void> {
  const channel = await getChannel();
  const queue = await channel.assertQueue('notifications.inventory-results', {
    durable: true,
  });

  await channel.bindQueue(queue.queue, ORDER_EVENTS_EXCHANGE, 'inventory.reserved');
  await channel.bindQueue(queue.queue, ORDER_EVENTS_EXCHANGE, 'inventory.rejected');

  channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      await recordNotification(pool, event.orderId, event.type, event.payload);
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to process inventory result event', err);
      channel.nack(msg, false, false);
    }
  });
}
