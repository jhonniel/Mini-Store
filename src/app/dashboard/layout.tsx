import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .is("read_at", null);

  return (
    <DashboardShell ctx={ctx} unread={count ?? 0}>
      {children}
    </DashboardShell>
  );
}
