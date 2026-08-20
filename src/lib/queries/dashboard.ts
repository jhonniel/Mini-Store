import { createClient } from "@/lib/supabase/server";
import type { DateRangeKey } from "@/lib/constants";
import { addCents } from "@/lib/money";
import type { MembershipContext, Product } from "@/types";

export function rangeToDates(range: DateRangeKey) {
  const end = new Date();
  const start = new Date();
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "7d") start.setDate(start.getDate() - 7);
  else if (range === "30d") start.setDate(start.getDate() - 30);
  else if (range === "3m") start.setMonth(start.getMonth() - 3);
  else if (range === "6m") start.setMonth(start.getMonth() - 6);
  else start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

function previousRange(range: DateRangeKey) {
  const { start, end } = rangeToDates(range);
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: start,
  };
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function getDashboardMetrics(ctx: MembershipContext, range: DateRangeKey = "30d") {
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const { start, end } = rangeToDates(range);
  const prev = previousRange(range);

  const [
    productsRes,
    ordersRes,
    prevOrdersRes,
    customersRes,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, current_stock, min_stock, cost_price, selling_price, status")
      .eq("organization_id", orgId)
      .is("deleted_at", null),
    supabase
      .from("orders")
      .select("id, total, amount_paid, balance, created_at, status")
      .eq("organization_id", orgId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    supabase
      .from("orders")
      .select("id, total, amount_paid, balance, created_at, status")
      .eq("organization_id", orgId)
      .gte("created_at", prev.start.toISOString())
      .lt("created_at", prev.end.toISOString()),
    supabase
      .from("customers")
      .select("id")
      .eq("organization_id", orgId)
      .is("deleted_at", null),
  ]);

  const products = (productsRes.data ?? []) as Pick<
    Product,
    "id" | "name" | "current_stock" | "min_stock" | "cost_price" | "selling_price" | "status"
  >[];
  const orders = (ordersRes.data ?? []).filter((o) => o.status !== "cancelled");
  const prevOrders = (prevOrdersRes.data ?? []).filter((o) => o.status !== "cancelled");

  const orderIds = orders.map((o) => o.id);
  const { data: items } = orderIds.length
    ? await supabase
        .from("order_items")
        .select("order_id, product_id, product_name, quantity, subtotal, profit, unit_cost_at_sale")
        .in("order_id", orderIds)
    : { data: [] as Array<{ product_id: string | null; product_name: string; quantity: string; subtotal: string; profit: string }> };

  const revenueCents = addCents(...orders.map((o) => o.total));
  const collectedCents = addCents(...orders.map((o) => o.amount_paid));
  const costCents = addCents(...(items ?? []).map((i) => i.subtotal === i.profit ? 0 : Number(i.subtotal) - Number(i.profit)));
  // Prefer stored profit so historical cost is preserved
  const profitCents = addCents(...(items ?? []).map((i) => i.profit));
  const actualCostCents = revenueCents - profitCents;

  const outstandingRes = await supabase
    .from("orders")
    .select("balance")
    .eq("organization_id", orgId)
    .gt("balance", 0)
    .not("status", "eq", "cancelled");

  const outstandingCents = addCents(...(outstandingRes.data ?? []).map((o) => o.balance));
  const inventoryValueCents = products.reduce(
    (sum, p) => sum + Math.round(Number(p.current_stock) * Number(p.cost_price) * 100),
    0
  );
  const potentialProfitCents = products.reduce(
    (sum, p) =>
      sum + Math.round(Number(p.current_stock) * (Number(p.selling_price) - Number(p.cost_price)) * 100),
    0
  );

  const lowStock = products.filter((p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock));
  const outOfStock = products.filter((p) => Number(p.current_stock) <= 0);

  const prevRevenue = addCents(...prevOrders.map((o) => o.total));
  const prevCollected = addCents(...prevOrders.map((o) => o.amount_paid));
  const prevOutstanding = addCents(...prevOrders.map((o) => o.balance));

  const soldMap = new Map<
    string,
    { id: string | null; name: string; qty: number; revenue: number; profit: number }
  >();
  for (const item of items ?? []) {
    const key = item.product_id ?? item.product_name;
    const current = soldMap.get(key) ?? {
      id: item.product_id ?? null,
      name: item.product_name,
      qty: 0,
      revenue: 0,
      profit: 0,
    };
    current.qty += Number(item.quantity);
    current.revenue += Number(item.subtotal);
    current.profit += Number(item.profit);
    soldMap.set(key, current);
  }
  const productSales = [...soldMap.values()].sort((a, b) => b.profit - a.profit);
  const topSelling = [...soldMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  const topProfit = productSales.slice(0, 8);

  const salesByDay = new Map<string, number>();
  for (const order of orders) {
    const day = order.created_at.slice(0, 10);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(order.total));
  }

  const { data: unsold } = await supabase
    .from("products")
    .select("id, name, current_stock")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .is("deleted_at", null);

  const soldProductIds = new Set((items ?? []).map((i) => i.product_id).filter(Boolean));
  const notSoldRecently = (unsold ?? []).filter((p) => !soldProductIds.has(p.id)).slice(0, 6);

  const { data: debtCustomers } = await supabase
    .from("orders")
    .select("customer_id, balance, customers(full_name)")
    .eq("organization_id", orgId)
    .gt("balance", 0)
    .not("status", "eq", "cancelled");

  const debtMap = new Map<string, { name: string; outstanding: number }>();
  for (const row of debtCustomers ?? []) {
    const customer = row.customers as unknown as { full_name: string } | { full_name: string }[] | null;
    const name = Array.isArray(customer) ? customer[0]?.full_name : customer?.full_name;
    const current = debtMap.get(row.customer_id) ?? { name: name ?? "Customer", outstanding: 0 };
    current.outstanding += Number(row.balance);
    debtMap.set(row.customer_id, current);
  }

  return {
    revenue: revenueCents / 100,
    cost: actualCostCents / 100,
    profit: profitCents / 100,
    collected: collectedCents / 100,
    outstanding: outstandingCents / 100,
    inventoryValue: inventoryValueCents / 100,
    potentialProfit: potentialProfitCents / 100,
    totalProducts: products.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    customerCount: customersRes.data?.length ?? 0,
    lowStock,
    topSelling,
    topProfit,
    productSales,
    notSoldRecently,
    outstandingCustomers: [...debtMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 8),
    salesSeries: [...salesByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total })),
    changes: {
      revenue: percentChange(revenueCents, prevRevenue),
      profit: percentChange(profitCents, prevRevenue === 0 ? 0 : prevRevenue),
      outstanding: percentChange(outstandingCents, prevOutstanding),
      sales: percentChange(revenueCents, prevRevenue),
      collected: percentChange(collectedCents, prevCollected),
    },
  };
}
