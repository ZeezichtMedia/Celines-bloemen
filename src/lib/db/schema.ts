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
// Products — alle producten (boeketten, vazen, decoratie)
// ============================================================
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'bouquet', 'vase', 'decoration'
  color: varchar('color', { length: 255 }),
  description: text('description'),
  image: text('image'),
  priceSmall: decimal('price_small', { precision: 10, scale: 2 }),
  priceMid: decimal('price_mid', { precision: 10, scale: 2 }),
  priceLarge: decimal('price_large', { precision: 10, scale: 2 }),
  price: decimal('price', { precision: 10, scale: 2 }), // for non-bouquet products (single price)
  available: boolean('available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  shippable: boolean('shippable').notNull().default(false), // can be shipped nationwide
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  frequency: varchar('frequency', { length: 20 }).notNull(), // 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'yearly'
  pricePerDelivery: decimal('price_per_delivery', { precision: 10, scale: 2 }).notNull(),

  // Mollie
  mollieCustomerId: varchar('mollie_customer_id', { length: 100 }),
  mollieMandateId: varchar('mollie_mandate_id', { length: 100 }),
  mollieSubscriptionId: varchar('mollie_subscription_id', { length: 100 }),

  // Schedule
  nextDeliveryDate: varchar('next_delivery_date', { length: 20 }),
  lastDeliveryDate: varchar('last_delivery_date', { length: 20 }),

  // Notes
  colorPreference: text('color_preference'),
  customerNote: text('customer_note'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
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
