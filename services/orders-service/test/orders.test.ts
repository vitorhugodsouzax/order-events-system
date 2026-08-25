import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app';
import { createPool, runMigrations } from '../src/db';

let pool: Pool;

beforeAll(async () => {
  pool = createPool();
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM orders');
});

describe('POST /orders', () => {
  it('creates an order with pending status and returns 201', async () => {
    const app = createApp(pool);
    const res = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 'p1', quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.id).toBeDefined();
    expect(res.body.items).toEqual([{ productId: 'p1', quantity: 2 }]);
  });

  it('rejects an order with no items', async () => {
    const app = createApp(pool);
    const res = await request(app).post('/orders').send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /orders/:id', () => {
  it('returns the created order', async () => {
    const app = createApp(pool);
    const createRes = await request(app)
      .post('/orders')
      .send({ items: [{ productId: 'p1', quantity: 1 }] });

    const getRes = await request(app).get(`/orders/${createRes.body.id}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(createRes.body.id);
  });

  it('returns 404 for an unknown id', async () => {
    const app = createApp(pool);
    const res = await request(app).get(
      '/orders/00000000-0000-0000-0000-000000000000'
    );

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-uuid id instead of crashing', async () => {
    const app = createApp(pool);
    const res = await request(app).get('/orders/not-a-uuid');

    expect(res.status).toBe(400);
  });
});
