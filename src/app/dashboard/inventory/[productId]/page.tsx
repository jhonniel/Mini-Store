import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/money";
import type { InventoryMovement } from "@/types";

export default async function InventoryHistoryPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const ctx = await requireWorkspace("inventory.view");
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!product) notFound();

  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`Current stock ${formatNumber(product.current_stock, 0)} ${product.unit}`}
      />
      <div className="space-y-2">
        {((movements ?? []) as InventoryMovement[]).map((move) => (
          <div key={move.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium capitalize">{move.type.replace("_", " ")}</p>
              <p className="text-muted-foreground">{new Date(move.created_at).toLocaleString()}</p>
              {move.notes ? <p className="text-muted-foreground">{move.notes}</p> : null}
            </div>
            <p className={Number(move.quantity) < 0 ? "text-destructive" : "text-emerald-600"}>
              {Number(move.quantity) > 0 ? "+" : ""}
              {formatNumber(move.quantity, 0)} → {formatNumber(move.quantity_after, 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
