import postgres from 'postgres';
import { invoices, customers, revenue, users } from './placeholder-data';

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    'Missing database connection string. Set SUPABASE_DB_URL or POSTGRES_URL in your environment.',
  );
}

export const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 1000,
});

let initialized = false;

export async function initializeDatabase() {
  if (initialized) {
    return;
  }

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql.begin(async (tx) => {
    await tx`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    await tx`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `;

    await tx`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        customer_id UUID NOT NULL REFERENCES customers(id),
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `;

    await tx`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `;

    await Promise.all(
      users.map((user) =>
        tx`
          INSERT INTO users (id, name, email, password)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password})
          ON CONFLICT (id) DO NOTHING;
        `,
      ),
    );

    await Promise.all(
      customers.map((customer) =>
        tx`
          INSERT INTO customers (id, name, email, image_url)
          VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
          ON CONFLICT (id) DO NOTHING;
        `,
      ),
    );

    await Promise.all(
      invoices.map((invoice) =>
        tx`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
          ON CONFLICT (id) DO NOTHING;
        `,
      ),
    );

    await Promise.all(
      revenue.map((rev) =>
        tx`
          INSERT INTO revenue (month, revenue)
          VALUES (${rev.month}, ${rev.revenue})
          ON CONFLICT (month) DO NOTHING;
        `,
      ),
    );
  });

  initialized = true;
}
