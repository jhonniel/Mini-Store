import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ActivityPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity log" description="An audit trail of important business actions." />
      {(data ?? []).length === 0 ? (
        <EmptyState title="No activity yet." description="Product, order, and payment events will appear here." />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((log) => (
            <div key={log.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between gap-4">
                <p className="font-medium">{log.description}</p>
                <p className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
              </div>
              <p className="text-muted-foreground">
                {log.action} · {log.entity_type}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
