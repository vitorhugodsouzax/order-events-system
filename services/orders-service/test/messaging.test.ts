import amqp from 'amqplib';
import { publishOrderCreated } from '../src/messaging/publisher';
import { ORDER_EVENTS_EXCHANGE, closeConnection } from '../src/messaging/connection';

afterAll(async () => {
  await closeConnection();
});

describe('publishOrderCreated', () => {
  it('publishes an order.created message to the order_events exchange', async () => {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const conn = await amqp.connect(url);
    const channel = await conn.createChannel();
    await channel.assertExchange(ORDER_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    const queue = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue.queue, ORDER_EVENTS_EXCHANGE, 'order.created');

    const received = new Promise<any>((resolve) => {
      channel.consume(queue.queue, (msg) => {
        if (msg) {
          const parsed = JSON.parse(msg.content.toString());
          if (parsed.orderId !== 'test-order-1') {
            channel.ack(msg); // not ours, ack and ignore
            return;
          }
          resolve(parsed);
          channel.ack(msg);
        }
      });
    });

    await publishOrderCreated({
      orderId: 'test-order-1',
      items: [{ productId: 'p1', quantity: 2 }],
    });

    const message = await received;
    expect(message.orderId).toBe('test-order-1');
    expect(message.type).toBe('order.created');
    expect(message.payload.items).toEqual([{ productId: 'p1', quantity: 2 }]);
    expect(message.occurredAt).toBeDefined();

    await channel.close();
    await conn.close();
  });
});
