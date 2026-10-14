import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  serial,
} from 'drizzle-orm/pg-core';

// ============================================================
// Boeketten (bestelpagina) en webshopproducten — bewerkbaar in het beheer
// Prijzen van boeketten staan als tekst ("€ 17,95"), zo toont en mailt de site ze.
// ============================================================
export const bouquets = pgTable('bouquets', {
  id: varchar('id', { length: 120 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 255 }).notNull().default(''),
  description: text('description').notNull().default(''),
  image: text('image').notNull().default(''),
  priceSmall: varchar('price_small', { length: 40 }).notNull(),
  priceMid: varchar('price_mid', { length: 40 }).notNull(),
  priceLarge: varchar('price_large', { length: 40 }).notNull(),
  available: boolean('available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shopProducts = pgTable('shop_products', {
  id: varchar('id', { length: 120 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  priceLabel: varchar('price_label', { length: 40 }).notNull(),
  image: text('image').notNull().default(''),
  category: varchar('category', { length: 50 }).notNull().default(''),
  available: boolean('available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  stock: integer('stock'), // null = onbeperkt, 0 = uitverkocht
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// Orders
// ============================================================
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  // 'pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'

  // Customer
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 30 }),

  // Delivery
  deliveryMethod: varchar('delivery_method', { length: 20 }).notNull(), // 'pickup', 'local', 'shipping'
  deliveryDate: varchar('delivery_date', { length: 20 }), // for local delivery
  deliveryAddress: text('delivery_address'),
  deliveryCity: varchar('delivery_city', { length: 255 }),
  deliveryPostalCode: varchar('delivery_postal_code', { length: 10 }),
  deliveryRegion: varchar('delivery_region', { length: 100 }),
  deliveryCost: decimal('delivery_cost', { precision: 10, scale: 2 }).notNull().default('0'),

  // Order details
  items: jsonb('items').notNull(), // [{ productId, name, size, quantity, price }]
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),

  // Payment
  paymentMethod: varchar('payment_method', { length: 30 }), // 'ideal', 'creditcard', 'bancontact'
  molliePaymentId: varchar('mollie_payment_id', { length: 100 }),
  paidAt: timestamp('paid_at'),

  // Notes
  customerNote: text('customer_note'),
  adminNote: text('admin_note'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// Subscriptions — bloemenabonnementen
// ============================================================
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  // 'active', 'paused', 'cancelled'

  // Customer
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 30 }),

  // Delivery address
  deliveryAddress: text('delivery_address'),
  deliveryCity: varchar('delivery_city', { length: 255 }),
  deliveryPostalCode: varchar('delivery_postal_code', { length: 10 }),

  // Plan
  planType: varchar('plan_type', { length: 30 }).notNull(), // 'fresh', 'artificial'
  planSize: varchar('plan_size', { length: 20 }).notNull(), // 'small', 'medium', 'large'
  frequency: varchar('frequency', { length: 20 }).notNull(), // 'weekly', 'biweekly', 'triweekly', 'monthly', 'quarterly', 'biannual', 'yearly'
  pricePerDelivery: decimal('price_per_delivery', { precision: 10, scale: 2 }).notNull(),
  vaseIncluded: boolean('vase_included').notNull().default(false), // boeket in leenvaas, wordt volgende levering geruild

  // Mollie
  mollieCustomerId: varchar('mollie_customer_id', { length: 100 }),
  mollieMandateId: varchar('mollie_mandate_id', { length: 100 }),
  mollieSubscriptionId: varchar('mollie_subscription_id', { length: 100 }),

  // Schedule
  nextDeliveryDate: varchar('next_delivery_date', { length: 20 }),
  lastDeliveryDate: varchar('last_delivery_date', { length: 20 }),

  // Laatste terugkerende incasso (voor de melding aan Celine, en idempotentie van de webhook)
  lastPaymentId: varchar('last_payment_id', { length: 100 }),
  lastPaymentStatus: varchar('last_payment_status', { length: 30 }),
  lastPaymentAt: timestamp('last_payment_at'),

  // Notes
  colorPreference: text('color_preference'),
  customerNote: text('customer_note'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// Settings — losse instellingen (verzendkosten, notificatiemail)
// ============================================================
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// Delivery settings — bezorggebieden en tarieven
// ============================================================
export const deliveryZones = pgTable('delivery_zones', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});
