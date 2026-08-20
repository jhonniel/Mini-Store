import { z } from "zod";
import { units } from "@/lib/constants";

export const categorySchema = z.object({
  name: z.string().min(2, "Enter a category name."),
  description: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Enter a product name."),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  unit: z.enum(units).default("piece"),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative."),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative."),
  currentStock: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).default(0),
  maxStock: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const inventoryAdjustSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().refine((n) => n !== 0, "Quantity cannot be zero."),
  type: z.enum(["added", "adjustment", "damage", "expired", "manual", "return"]),
  notes: z.string().optional(),
});
