import { Pool } from 'pg';
import { getChannel, ORDER_EVENTS_EXCHANGE } from './connection';

export async function startInventoryResultConsumer(pool: Pool): Promise<void> {
  const channel = await getChannel();
  const queue = await channel.assertQueue('orders.inventory-results', {
    durable: true,
  });

  await channel.bindQueue(queue.queue, ORDER_EVENTS_EXCHANGE, 'inventory.reserved');
  await channel.bindQueue(queue.queue, ORDER_EVENTS_EXCHANGE, 'inventory.rejected');

  channel.consume(queue.queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const newStatus = event.type === 'inventory.reserved' ? 'confirmed' : 'rejected';

      await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [
        newStatus,
        event.orderId,
      ]);

      channel.ack(msg);
    } catch (err) {
      console.error('Failed to process inventory result event', err);
      channel.nack(msg, false, false);
    }
  });
}
