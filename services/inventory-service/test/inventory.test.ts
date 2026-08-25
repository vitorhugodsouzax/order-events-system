import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app';
import { createPool, runMigrations } from '../src/db';
import { reserveStock } from '../src/messaging/consumer';

let pool: Pool;

beforeAll(async () => {
  pool = createPool();
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM products');
});

describe('POST /products and GET /products', () => {
  it('creates a product and lists it', async () => {
    const app = createApp(pool);
    await request(app)
      .post('/products')
      .send({ id: 'p1', name: 'Widget', stock: 10 })
      .expect(201);

    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'p1', name: 'Widget', stock: 10 }]);
  });
});

describe('reserveStock', () => {
  it('debits stock and returns reserved:true when enough stock exists', async () => {
    await pool.query('INSERT INTO products (id, name, stock) VALUES ($1, $2, $3)', [
      'p1',
      'Widget',
      10,
    ]);

    const result = await reserveStock(pool, [{ productId: 'p1', quantity: 3 }]);

    expect(result).toEqual({ reserved: true });

    const row = await pool.query('SELECT stock FROM products WHERE id = $1', ['p1']);
    expect(row.rows[0].stock).toBe(7);
  });

  it('returns reserved:false with a reason and does not debit when stock is insufficient', async () => {
    await pool.query('INSERT INTO products (id, name, stock) VALUES ($1, $2, $3)', [
      'p1',
      'Widget',
      2,
    ]);

    const result = await reserveStock(pool, [{ productId: 'p1', quantity: 5 }]);

    expect(result.reserved).toBe(false);
    expect(result.reason).toBeDefined();

    const row = await pool.query('SELECT stock FROM products WHERE id = $1', ['p1']);
    expect(row.rows[0].stock).toBe(2);
  });
});
