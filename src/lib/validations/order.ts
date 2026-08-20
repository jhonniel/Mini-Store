import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2, "Enter the customer name."),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive", "blocked"]).default("active"),
});

export const checkoutSchema = z.object({
  paymentType: z.enum(["full", "partial", "pay_later"]),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentMethod: z.string().default("cash"),
  amountTendered: z.coerce.number().min(0).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  customerId: z.string().uuid().optional(),
});

export const paymentSchema = z.object({
  customerId: z.string().uuid(),
  orderId: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Enter a payment amount."),
  paymentMethod: z.string().min(1, "Select a payment method."),
  amountTendered: z.coerce.number().min(0).optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
});
