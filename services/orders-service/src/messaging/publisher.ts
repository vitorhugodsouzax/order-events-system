import { getChannel, ORDER_EVENTS_EXCHANGE } from './connection';

interface OrderCreatedEvent {
  orderId: string;
  items: { productId: string; quantity: number }[];
}

export async function publishOrderCreated(
  event: OrderCreatedEvent
): Promise<void> {
  const channel = await getChannel();
  const message = {
    orderId: event.orderId,
    type: 'order.created',
    payload: { items: event.items },
    occurredAt: new Date().toISOString(),
  };

  channel.publish(
    ORDER_EVENTS_EXCHANGE,
    'order.created',
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
}
