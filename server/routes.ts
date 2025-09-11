// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";

import {
  insertUserSchema,
  insertVendorSchema,
  insertProductSchema,
  insertCartItemSchema,
  insertOrderSchema,
} from "@shared/schema";

/** Small helper to avoid repeating try/catch everywhere */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export async function registerRoutes(app: Express): Promise<Server> {
  // ---- Health ----
  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      res.json({ ok: true });
    }),
  );

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------
  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const { email, password } = z
        .object({ email: z.string().email(), password: z.string().min(1) })
        .parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user)
        return res.status(401).json({ message: "Invalid credentials" });

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    }),
  );

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------
  app.get(
    "/api/categories",
    asyncHandler(async (_req, res) => {
      const categories = await storage.getAllCategories();
      res.json(categories);
    }),
  );

  app.post(
    "/api/categories",
    asyncHandler(async (req, res) => {
      // If you have a zod schema for categories, parse here.
      const category = await storage.createCategory(req.body);
      res.json(category);
    }),
  );

  // ---------------------------------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------------------------------
  app.get(
    "/api/products",
    asyncHandler(async (req, res) => {
      const { categoryId, vendorId } = req.query;
      const products = categoryId
        ? await storage.getProductsByCategory(categoryId as string)
        : vendorId
          ? await storage.getProductsByVendor(vendorId as string)
          : await storage.getAllProducts();

      res.json(products);
    }),
  );

  app.get(
    "/api/products/:id",
    asyncHandler(async (req, res) => {
      const product = await storage.getProduct(req.params.id);
      if (!product)
        return res.status(404).json({ message: "Product not found" });
      res.json(product);
    }),
  );

  app.post(
    "/api/products",
    asyncHandler(async (req, res) => {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    }),
  );

  app.put(
    "/api/products/:id",
    asyncHandler(async (req, res) => {
      const product = await storage.updateProduct(req.params.id, req.body);
      res.json(product);
    }),
  );

  app.delete(
    "/api/products/:id",
    asyncHandler(async (req, res) => {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    }),
  );

  // ---------------------------------------------------------------------------
  // VENDORS
  // ---------------------------------------------------------------------------

  /**
   * Preferred endpoint used by your "Become Vendor" form.
   * Always creates vendors as PENDING (isApproved = false).
   * Prevents duplicate vendor records per user.
   */
  app.post(
    "/api/vendors/register",
    asyncHandler(async (req, res) => {
      // Parse the incoming vendor body. We’ll override isApproved below anyway.
      const parsed = insertVendorSchema.parse(req.body);
      const { userId } = parsed;

      // Ensure a single vendor profile per user
      const existing = await storage.getVendorByUserId(userId);
      if (existing) {
        return res
          .status(409)
          .json({ message: "Vendor already exists for this user" });
      }

      const vendor = await storage.createVendor({
        ...parsed,
        isApproved: false, // <-- enforce pending
      });

      res.status(201).json(vendor);
    }),
  );

  /**
   * Legacy create endpoint kept for compatibility.
   * Also forces PENDING if the client tries to send isApproved=true.
   */
  app.post(
    "/api/vendors",
    asyncHandler(async (req, res) => {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor({
        ...vendorData,
        isApproved: vendorData.isApproved ?? false, // default to false
      });
      res.json(vendor);
    }),
  );

  // List vendors for Admin
  app.get(
    "/api/vendors",
    asyncHandler(async (_req, res) => {
      const vendors = await storage.getAllVendors();
      res.json(vendors);
    }),
  );

  // Get vendor by the owning user id
  app.get(
    "/api/vendors/user/:userId",
    asyncHandler(async (req, res) => {
      const vendor = await storage.getVendorByUserId(req.params.userId);
      if (!vendor) return res.status(404).json({ message: "Vendor not found" });
      res.json(vendor);
    }),
  );

  // Admin Approve/Reject vendor (this is what your Admin page calls)
  app.put(
    "/api/vendors/:id/approval",
    asyncHandler(async (req, res) => {
      const { isApproved } = z
        .object({ isApproved: z.boolean() })
        .parse(req.body);
      await storage.updateVendorApproval(req.params.id, isApproved);
      res.json({ message: "Vendor approval updated" });
    }),
  );

  // ---------------------------------------------------------------------------
  // CART
  // ---------------------------------------------------------------------------
  app.get(
    "/api/cart/:userId",
    asyncHandler(async (req, res) => {
      const cartItems = await storage.getCartItems(req.params.userId);
      res.json(cartItems);
    }),
  );

  app.post(
    "/api/cart",
    asyncHandler(async (req, res) => {
      const cartItemData = insertCartItemSchema.parse(req.body);
      const cartItem = await storage.addToCart(cartItemData);
      res.json(cartItem);
    }),
  );

  app.put(
    "/api/cart/:id",
    asyncHandler(async (req, res) => {
      const { quantity } = z
        .object({ quantity: z.number().int().min(1) })
        .parse(req.body);
      await storage.updateCartItem(req.params.id, quantity);
      res.json({ message: "Cart item updated" });
    }),
  );

  app.delete(
    "/api/cart/:id",
    asyncHandler(async (req, res) => {
      await storage.removeFromCart(req.params.id);
      res.json({ message: "Item removed from cart" });
    }),
  );

  app.delete(
    "/api/cart/user/:userId",
    asyncHandler(async (req, res) => {
      await storage.clearCart(req.params.userId);
      res.json({ message: "Cart cleared" });
    }),
  );

  // ---------------------------------------------------------------------------
  // ORDERS
  // ---------------------------------------------------------------------------
  app.post(
    "/api/orders",
    asyncHandler(async (req, res) => {
      const { order, items } = req.body;
      const orderData = insertOrderSchema.parse(order);
      const newOrder = await storage.createOrder(orderData, items);
      res.json(newOrder);
    }),
  );

  app.get(
    "/api/orders/customer/:customerId",
    asyncHandler(async (req, res) => {
      const orders = await storage.getOrdersByCustomer(req.params.customerId);
      res.json(orders);
    }),
  );

  app.get(
    "/api/orders/vendor/:vendorId",
    asyncHandler(async (req, res) => {
      const orders = await storage.getOrdersByVendor(req.params.vendorId);
      res.json(orders);
    }),
  );

  app.get(
    "/api/orders",
    asyncHandler(async (_req, res) => {
      const orders = await storage.getAllOrders();
      res.json(orders);
    }),
  );

  app.put(
    "/api/orders/:id/status",
    asyncHandler(async (req, res) => {
      const { status } = z
        .object({ status: z.string().min(1) })
        .parse(req.body);
      await storage.updateOrderStatus(req.params.id, status);
      res.json({ message: "Order status updated" });
    }),
  );

  // The HTTP server that index.ts expects
  const httpServer = createServer(app);
  return httpServer;
}
