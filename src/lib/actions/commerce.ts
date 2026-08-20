"use server";

import { revalidatePath } from "next/cache";
import { requireStoreCustomer, requireWorkspace } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/utils";
import { cashChange, isCashMethod } from "@/lib/payments";
import { cartItemSchema, checkoutSchema, customerSchema, paymentSchema } from "@/lib/validations/order";

export async function upsertCustomer(formData: FormData, customerId?: string) {
  const ctx = await requireWorkspace("customers.manage");
  const parsed = customerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    address: formData.get("address") || "",
    notes: formData.get("notes") || "",
    status: formData.get("status") || "active",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to save customer." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const payload = {
    organization_id: ctx.organization.id,
    full_name: parsed.data.fullName,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null,
    status: parsed.data.status,
  };

  const query = customerId
    ? supabase.from("customers").update(payload).eq("id", customerId).eq("organization_id", ctx.organization.id)
    : supabase.from("customers").insert(payload).select("id").single();

  const { error } = await query;
  if (error) return { error: getErrorMessage(error, "Unable to save customer.") };

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: customerId ? "customer.updated" : "customer.created",
    entity_type: "customer",
    entity_id: customerId ?? null,
    description: `${parsed.data.fullName} ${customerId ? "updated" : "created"}`,
  });

  revalidatePath("/dashboard/customers");
  return { success: customerId ? "Customer updated." : "Customer created." };
}

export async function addToCart(slug: string, formData: FormData) {
  const ctx = await requireStoreCustomer(slug);
  const parsed = cartItemSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") || 1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to add to cart." };
  }

  const { data: product, error: productError } = await ctx.supabase
    .from("products")
    .select("id, current_stock, name, status")
    .eq("id", parsed.data.productId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (productError || !product || product.status !== "active") {
    return { error: "This product is no longer available." };
  }

  const { data: existing } = await ctx.supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organization.id)
    .eq("product_id", parsed.data.productId)
    .maybeSingle();

  const nextQty = Number(existing?.quantity ?? 0) + parsed.data.quantity;
  if (nextQty > Number(product.current_stock)) {
    return {
      error: `Insufficient stock.\n\nAvailable: ${Number(product.current_stock)}\nRequested: ${nextQty}`,
    };
  }

  const { error } = existing
    ? await ctx.supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id)
    : await ctx.supabase.from("cart_items").insert({
        organization_id: ctx.organization.id,
        user_id: ctx.user.id,
        product_id: parsed.data.productId,
        quantity: parsed.data.quantity,
      });

  if (error) return { error: getErrorMessage(error, "Unable to add to cart.") };
  revalidatePath(`/store/${slug}/cart`);
  return { success: `${product.name} added to cart.` };
}

export async function updateCartItem(slug: string, itemId: string, quantity: number) {
  const ctx = await requireStoreCustomer(slug);
  if (quantity <= 0) {
    await ctx.supabase.from("cart_items").delete().eq("id", itemId).eq("user_id", ctx.user.id);
  } else {
    const { error } = await ctx.supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .eq("user_id", ctx.user.id);
    if (error) return { error: getErrorMessage(error, "Unable to update cart.") };
  }
  revalidatePath(`/store/${slug}/cart`);
  return { success: "Cart updated." };
}

export async function clearCart(slug: string) {
  const ctx = await requireStoreCustomer(slug);
  await ctx.supabase
    .from("cart_items")
    .delete()
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organization.id);
  revalidatePath(`/store/${slug}/cart`);
  return { success: "Cart cleared." };
}

export async function checkout(slug: string, formData: FormData) {
  const ctx = await requireStoreCustomer(slug);
  const parsed = checkoutSchema.safeParse({
    paymentType: formData.get("paymentType"),
    amountPaid: formData.get("amountPaid") || 0,
    paymentMethod: formData.get("paymentMethod") || "cash",
    dueDate: formData.get("dueDate") || undefined,
    notes: formData.get("notes") || undefined,
    discount: formData.get("discount") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to place order." };
  }

  const { data: items } = await ctx.supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", ctx.user.id)
    .eq("organization_id", ctx.organization.id);

  if (!items?.length) return { error: "Your cart is empty." };

  const { data, error } = await ctx.supabase.rpc("place_order", {
    p_organization_id: ctx.organization.id,
    p_items: items.map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) })),
    p_payment_type: parsed.data.paymentType,
    p_amount_paid: parsed.data.amountPaid,
    p_payment_method: parsed.data.paymentMethod,
    p_due_date: parsed.data.dueDate || null,
    p_notes: parsed.data.notes || null,
    p_discount: parsed.data.discount,
    p_customer_id: null,
  });

  if (error) return { error: getErrorMessage(error, "Unable to place your order.") };

  const result = data as { order_id: string; order_number: string };
  revalidatePath(`/store/${slug}`);
  revalidatePath("/dashboard/orders");
  return { success: `Order ${result.order_number} submitted.`, ...result };
}

export async function adminPlaceOrder(formData: FormData) {
  const ctx = await requireWorkspace("orders.process");
  const parsed = checkoutSchema.safeParse({
    paymentType: formData.get("paymentType"),
    amountPaid: formData.get("amountPaid") || 0,
    paymentMethod: formData.get("paymentMethod") || "cash",
    amountTendered: formData.get("amountTendered") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    notes: formData.get("notes") || undefined,
    discount: formData.get("discount") || 0,
    customerId: formData.get("customerId"),
  });
  if (!parsed.success || !parsed.data.customerId) {
    return { error: parsed.error?.issues[0]?.message ?? "Select a customer." };
  }

  if (isCashMethod(parsed.data.paymentMethod) && parsed.data.amountPaid > 0) {
    const tendered = parsed.data.amountTendered ?? 0;
    if (tendered < parsed.data.amountPaid && parsed.data.paymentType === "full") {
      return { error: "Cash received is less than the total. Enter the cash given, or choose partial payment." };
    }
  }

  const rawItems = String(formData.get("items") || "[]");
  let items: Array<{ product_id: string; quantity: number }> = [];
  try {
    items = JSON.parse(rawItems) as Array<{ product_id: string; quantity: number }>;
  } catch {
    return { error: "Invalid order items." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_organization_id: ctx.organization.id,
    p_items: items,
    p_payment_type: parsed.data.paymentType,
    p_amount_paid: parsed.data.amountPaid,
    p_payment_method: parsed.data.paymentMethod,
    p_due_date: parsed.data.dueDate || null,
    p_notes: parsed.data.notes || null,
    p_discount: parsed.data.discount,
    p_customer_id: parsed.data.customerId,
  });
  if (error) return { error: getErrorMessage(error, "Unable to create order.") };
  const result = data as { order_id?: string };
  await saveCashTender(
    supabase,
    ctx.organization.id,
    parsed.data.paymentMethod,
    parsed.data.amountTendered,
    parsed.data.amountPaid,
    result.order_id
  );
  revalidatePath("/dashboard/orders");
  return { success: "Sale created.", ...result };
}

async function saveCashTender(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  organizationId: string,
  paymentMethod: string,
  tendered: number | undefined,
  due: number,
  orderId?: string | null
) {
  if (!isCashMethod(paymentMethod) || tendered == null || !Number.isFinite(tendered)) return;
  const { change } = cashChange(tendered, due);
  const note = `Cash received ${tendered.toFixed(2)}. Change ${change.toFixed(2)}.`;
  let query = supabase
    .from("payments")
    .select("id, notes")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (orderId) query = query.eq("order_id", orderId);
  const { data } = await query.maybeSingle();
  if (!data) return;
  const { error } = await supabase
    .from("payments")
    .update({
      amount_tendered: tendered,
      change_due: change,
      notes: [data.notes, note].filter(Boolean).join("\n"),
    })
    .eq("id", data.id);
  if (error) {
    await supabase
      .from("payments")
      .update({ notes: [data.notes, note].filter(Boolean).join("\n") })
      .eq("id", data.id);
  }
}

export async function recordPayment(formData: FormData) {
  const ctx = await requireWorkspace("payments.record");
  const parsed = paymentSchema.safeParse({
    customerId: formData.get("customerId"),
    orderId: formData.get("orderId") || "",
    amount: formData.get("amount") || formData.get("amountDue"),
    paymentMethod: formData.get("paymentMethod"),
    amountTendered: formData.get("amountTendered") || undefined,
    referenceNumber: formData.get("referenceNumber") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to record payment." };
  }

  let amount = parsed.data.amount;
  if (isCashMethod(parsed.data.paymentMethod) && parsed.data.amountTendered != null) {
    const due = Number(formData.get("amountDue") || parsed.data.amount);
    const { applied } = cashChange(parsed.data.amountTendered, due);
    if (applied <= 0) return { error: "Enter the cash received." };
    amount = applied;
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_customer_id: parsed.data.customerId,
    p_amount: amount,
    p_payment_method: parsed.data.paymentMethod,
    p_reference_number: parsed.data.referenceNumber || null,
    p_notes: parsed.data.notes || null,
    p_order_id: parsed.data.orderId || null,
  });
  if (error) return { error: getErrorMessage(error, "Unable to record payment.") };
  await saveCashTender(
    supabase,
    ctx.organization.id,
    parsed.data.paymentMethod,
    parsed.data.amountTendered,
    amount,
    parsed.data.orderId || null
  );
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  return { success: "Payment recorded." };
}

export async function updateOrderStatus(orderId: string, status: string) {
  await requireWorkspace("orders.process");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) return { error: getErrorMessage(error, "Unable to update order.") };
  revalidatePath("/dashboard/orders");
  return { success: "Order updated." };
}

export async function confirmReceived(slug: string, orderId: string, itemIds: string[]) {
  const ctx = await requireStoreCustomer(slug);
  const { error } = await ctx.supabase.rpc("confirm_items_received", {
    p_order_id: orderId,
    p_item_ids: itemIds,
  });
  if (error) return { error: getErrorMessage(error, "Unable to confirm received items.") };
  revalidatePath(`/store/${slug}/received`);
  revalidatePath("/dashboard/orders");
  return { success: "Items marked as received." };
}

export async function processReturn(formData: FormData) {
  await requireWorkspace("orders.process");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("process_return", {
    p_order_id: formData.get("orderId"),
    p_item_id: formData.get("itemId"),
    p_quantity: Number(formData.get("quantity")),
    p_restock: formData.get("restock") !== "false",
    p_notes: formData.get("notes") || null,
  });
  if (error) return { error: getErrorMessage(error, "Unable to process return.") };
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/inventory");
  return { success: "Return processed." };
}
