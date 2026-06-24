import bcrypt from 'bcryptjs';
import { sql } from '../lib/db';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

type Sql = typeof sql;

async function seedUsers(db: Sql) {
  await db`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await db`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return db`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );
}

async function seedCustomers(db: Sql) {
  await db`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  await Promise.all(
    customers.map((customer) =>
      db`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );
}

async function seedInvoices(db: Sql) {
  await db`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id UUID NOT NULL REFERENCES customers(id),
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  await Promise.all(
    invoices.map((invoice) =>
      db`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );
}

async function seedRevenue(db: Sql) {
  await db`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  await Promise.all(
    revenue.map((rev) =>
      db`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );
}

export async function GET() {
  try {
    await sql.begin(async (transaction) => {
      await seedUsers(transaction);
      await seedCustomers(transaction);
      await seedInvoices(transaction);
      await seedRevenue(transaction);
    });

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json(
      { error: typeof error === 'object' ? (error as Error).message : error },
      { status: 500 },
    );
  }
}
