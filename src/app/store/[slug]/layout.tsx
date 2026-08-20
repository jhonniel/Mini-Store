import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/store/store-header";
import { getPublicStore, getUser } from "@/lib/auth/session";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, organization } = await getPublicStore(slug);
  if (!organization) notFound();

  const { user } = await getUser();
  let cartCount = 0;
  let isStaff = false;
  if (user) {
    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("user_id", user.id);
    cartCount = count ?? 0;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    isStaff = membership?.role === "admin" || membership?.role === "staff";
  }

  return (
    <div className="flex min-h-full flex-col">
      <StoreHeader
        organization={organization}
        cartCount={cartCount}
        isStaff={isStaff}
        signedIn={Boolean(user)}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
