import { getChannel, ORDER_EVENTS_EXCHANGE } from './connection';

export async function publishInventoryResult(
  orderId: string,
  reserved: boolean,
  reason?: string
): Promise<void> {
  const channel = await getChannel();
  const type = reserved ? 'inventory.reserved' : 'inventory.rejected';
  const message = {
    orderId,
    type,
    payload: reason ? { reason } : {},
    occurredAt: new Date().toISOString(),
  };

  channel.publish(
    ORDER_EVENTS_EXCHANGE,
    type,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
}
