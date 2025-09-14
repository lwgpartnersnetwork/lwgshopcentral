// shared/schema.ts
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* =========================
   Users
========================= */
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("customer"), // customer | vendor | admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   Vendors
========================= */
export const vendors = pgTable("vendors", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storeName: text("store_name").notNull(),
  description: text("description"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   Categories
========================= */
export const categories = pgTable("categories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon").notNull(), // e.g. "electronics", "home", "shirt"
});

/* =========================
   Products
========================= */
export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Stored in NLE by default
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   Orders
   (One order PER vendor for a cart; supports guest checkout too)
========================= */
export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // The vendor who will fulfill this order (we split by vendor at checkout)
  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),

  // Optional logged-in user (nullable so guests can order)
  customerId: varchar("customer_id").references(() => users.id),

  // Contact details captured at checkout (not nullable)
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),

  // Currency handling (NLE primary; USD optional with rate)
  currency: varchar("currency", { length: 8 }).notNull().default("NLE"), // "NLE" | "USD"
  rate: decimal("rate", { precision: 12, scale: 4 }).notNull().default("1"), // NLE per USD (or 1 when currency=NLE)

  // Money fields are stored as strings by pg; format in app
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  shippingFee: decimal("shipping_fee", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  total: decimal("total", { precision: 14, scale: 2 }).notNull(),

  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // "mobile_money" | "bank_transfer" | "cod"
  notes: text("notes"),

  // Optional but useful: structured address; keep a default empty object
  shippingAddress: jsonb("shipping_address")
    .notNull()
    .default(sql`'{}'::jsonb`),

  status: text("status").notNull().default("pending"), // pending | paid | delivered | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   Order Items
   (Captured snapshot of product at purchase time)
========================= */
export const orderItems = pgTable("order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),

  productId: varchar("product_id")
    .notNull()
    .references(() => products.id),

  vendorId: varchar("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),

  // snapshot fields for reliability even if product changes later
  name: text("name").notNull(),
  imageUrl: text("image_url"),

  // unit price in the order currency at time of purchase
  price: decimal("price", { precision: 14, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

/* =========================
   Cart Items (per user)
========================= */
export const cartItems = pgTable("cart_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================
   Relations
========================= */
export const usersRelations = relations(users, ({ one, many }) => ({
  // a user may have one vendor profile
  vendor: one(vendors, {
    fields: [users.id],
    references: [vendors.userId],
  }),
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  products: many(products),
  orders: many(orders),
  orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [products.vendorId],
    references: [vendors.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  vendor: one(vendors, {
    fields: [orders.vendorId],
    references: [vendors.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  vendor: one(vendors, {
    fields: [orderItems.vendorId],
    references: [vendors.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

/* =========================
   Insert Schemas (Zod)
========================= */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

/* =========================
   Types
========================= */
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;


// … existing imports at top
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

// --- keep your other tables here (users, categories, products, …) ---

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // ✅ userId is OPTIONAL so people can apply before creating an account
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),

  storeName: text("store_name").notNull(),

  // ✅ new fields so the admin can contact the applicant
  email: text("email"),
  phone: text("phone"),
  address: text("address"),

  description: text("description"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// … keep the rest of your tables & relations below

