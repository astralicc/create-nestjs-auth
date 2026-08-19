import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
  uuid,
} from 'drizzle-orm/pg-core';

// ProductStatus enum
export const productStatusEnum = pgEnum('product_status', [
  'ACTIVE',
  'INACTIVE',
  'OUT_OF_STOCK',
  'DISCONTINUED',
]);

// Products table
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 50 }).notNull().unique(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').default(0).notNull(),
  category: varchar('category', { length: 100 }),
  status: productStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Inferred types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
