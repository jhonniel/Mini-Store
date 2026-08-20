import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { markNotificationsRead } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/shared/submit-button";

export default async function NotificationsPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        actions={
          <form action={markNotificationsRead}>
            <SubmitButton variant="outline">Mark all read</SubmitButton>
          </form>
        }
      />
      {(data ?? []).length === 0 ? (
        <EmptyState title="You're all caught up." description="Low stock, new orders, and payments will show here." />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex justify-between gap-4">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <p className="text-sm text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
