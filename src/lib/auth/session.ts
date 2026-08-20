import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type PermissionKey } from "@/config/permissions";
import type {
  BusinessSettings,
  MembershipContext,
  Organization,
  OrganizationMember,
  Profile,
} from "@/types";

const ORG_COOKIE = "sf-org";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireUser(next = "/") {
  const { supabase, user } = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return { supabase, user };
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data as Profile | null;
}

export async function getMemberships(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", userId)
    .eq("status", "active");
  return data ?? [];
}

export async function requireWorkspace(permission?: PermissionKey): Promise<MembershipContext> {
  const { supabase, user } = await requireUser();
  const cookieStore = await cookies();
  const preferredOrg = cookieStore.get(ORG_COOKIE)?.value;

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  const staffMemberships = (memberships ?? []).filter(
    (m) => m.role === "admin" || m.role === "staff"
  ) as OrganizationMember[];

  if (staffMemberships.length === 0) {
    const anyMembership = (memberships ?? []) as OrganizationMember[];
    if (anyMembership.length === 0) {
      redirect("/onboarding");
    }
    redirect("/forbidden");
  }

  const membership =
    staffMemberships.find((m) => m.organization_id === preferredOrg) ?? staffMemberships[0];

  const [{ data: organization }, { data: profile }, { data: settings }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", membership.organization_id).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("business_settings")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
  ]);

  if (!organization || !profile) {
    redirect("/onboarding");
  }

  const context: MembershipContext = {
    user: { id: user.id, email: user.email },
    profile: profile as Profile,
    organization: organization as Organization,
    membership,
    settings: (settings as BusinessSettings | null) ?? null,
  };

  if (permission && !hasPermission(membership.role, membership.permissions, permission)) {
    redirect("/forbidden");
  }

  return context;
}

export async function requireStoreCustomer(slug: string) {
  const { supabase, user } = await requireUser(`/store/${slug}`);
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!organization) {
    redirect("/store");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    const { error } = await supabase.rpc("join_store_as_customer", { p_slug: slug });
    if (error) {
      redirect(`/store/${slug}?error=join`);
    }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: settings } = await supabase
    .from("business_settings")
    .select("*")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const { data: refreshed } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email },
    profile: profile as Profile,
    organization: organization as Organization,
    membership: refreshed as OrganizationMember,
    settings: (settings as BusinessSettings | null) ?? null,
    supabase,
  };
}

export async function getPublicStore(slug: string) {
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  return { supabase, organization: organization as Organization | null };
}

export async function getDefaultStore() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membership) {
      const { data: organization } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", membership.organization_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (organization) {
        return { supabase, organization: organization as Organization, user };
      }
    }
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { supabase, organization: organization as Organization | null, user };
}

