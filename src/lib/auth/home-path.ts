import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/config/permissions";

export function isStaffRole(role: AppRole | string | null | undefined) {
  return role === "admin" || role === "staff";
}

export function isSafeAppPath(path: string) {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/login") &&
    !path.startsWith("/register") &&
    !path.startsWith("/api") &&
    !path.startsWith("/auth")
  );
}

type MemberRow = {
  role: AppRole;
  organizations: { slug: string } | { slug: string }[] | null;
};

function memberSlug(row: MemberRow) {
  const org = row.organizations;
  if (Array.isArray(org)) return org[0]?.slug ?? null;
  return org?.slug ?? null;
}

export async function resolveAppHome(
  supabase: SupabaseClient,
  userId: string,
  requestedNext?: string | null
): Promise<string> {
  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations(slug)")
    .eq("user_id", userId)
    .eq("status", "active");

  const members = (data ?? []) as MemberRow[];
  const staff = members.find((m) => isStaffRole(m.role));
  const fallback = staff ?? members[0];
  const slug = fallback ? memberSlug(fallback) : null;
  const shopHome = slug ? `/store/${slug}` : "/";
  const roleHome = staff ? "/dashboard" : fallback ? shopHome : "/onboarding";

  const next = requestedNext?.trim() ?? "";
  if (next && isSafeAppPath(next) && next !== "/") {
    if (next.startsWith("/dashboard") || next === "/forbidden") {
      return staff ? (next === "/forbidden" ? "/dashboard" : next) : shopHome;
    }
    return next;
  }

  return roleHome;
}
