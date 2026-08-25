import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app';
import { createPool, runMigrations } from '../src/db';
import { recordNotification } from '../src/messaging/consumer';

let pool: Pool;

beforeAll(async () => {
  pool = createPool();
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM notifications');
});

const ORDER_ID_1 = '11111111-1111-1111-1111-111111111111';
const ORDER_ID_2 = '22222222-2222-2222-2222-222222222222';
const ORDER_ID_3 = '33333333-3333-3333-3333-333333333333';

describe('recordNotification', () => {
  it('stores a reserved notification', async () => {
    await recordNotification(pool, ORDER_ID_1, 'inventory.reserved', {});

    const res = await pool.query('SELECT * FROM notifications WHERE order_id = $1', [
      ORDER_ID_1,
    ]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].type).toBe('inventory.reserved');
    expect(res.rows[0].message).toContain(ORDER_ID_1);
  });

  it('stores a rejected notification including the reason', async () => {
    await recordNotification(pool, ORDER_ID_2, 'inventory.rejected', {
      reason: 'insufficient stock for p1',
    });

    const res = await pool.query('SELECT * FROM notifications WHERE order_id = $1', [
      ORDER_ID_2,
    ]);
    expect(res.rows[0].message).toContain('insufficient stock for p1');
  });
});

describe('GET /notifications/:orderId', () => {
  it('returns the notification history for an order', async () => {
    await recordNotification(pool, ORDER_ID_3, 'inventory.reserved', {});

    const app = createApp(pool);
    const res = await request(app).get(`/notifications/${ORDER_ID_3}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].orderId).toBe(ORDER_ID_3);
    expect(res.body[0].type).toBe('inventory.reserved');
  });

  it('returns 400 for a non-uuid order id', async () => {
    const app = createApp(pool);
    const res = await request(app).get('/notifications/not-a-uuid');

    expect(res.status).toBe(400);
  });
});
