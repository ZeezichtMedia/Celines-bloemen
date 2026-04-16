import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Seed initial delivery zones (matching previously hardcoded values)
await sql`INSERT INTO delivery_zones (name, cost, sort_order) VALUES
  ('Arnemuiden', 3.00, 0),
  ('Middelburg', 5.00, 1),
  ('Walcheren / Z-Beveland', 8.00, 2)
ON CONFLICT DO NOTHING`;

console.log('Delivery zones seeded!');
