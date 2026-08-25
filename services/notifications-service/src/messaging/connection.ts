import amqp, { Channel, ChannelModel } from 'amqplib';

const EXCHANGE = 'order_events';
let connection: ChannelModel | undefined;
let channel: Channel | undefined;

export async function getChannel(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  connection = await amqp.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  return channel;
}

export async function closeConnection(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = undefined;
  }
  if (connection) {
    await connection.close();
    connection = undefined;
  }
}

export const ORDER_EVENTS_EXCHANGE = EXCHANGE;
