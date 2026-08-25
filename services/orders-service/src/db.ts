import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export function createPool(): Pool {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@localhost:5433/orders',
  });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
    await pool.query(sql);
  }
}
