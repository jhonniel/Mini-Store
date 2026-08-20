import Link from "next/link";
import { Store } from "lucide-react";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { getDefaultStore } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let organization: { name: string; slug: string } | null = null;
  let cartCount = 0;
  let userId: string | null = null;
  let isStaff = false;

  try {
    const store = await getDefaultStore();
    organization = store.organization;
    userId = store.user?.id ?? null;
    if (store.organization && store.user) {
      const { data: membership } = await store.supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", store.organization.id)
        .eq("user_id", store.user.id)
        .eq("status", "active")
        .maybeSingle();
      isStaff = membership?.role === "admin" || membership?.role === "staff";
      const { count } = await store.supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", store.organization.id)
        .eq("user_id", store.user.id);
      cartCount = count ?? 0;
    }
  } catch {
    organization = null;
  }

  const slug = organization?.slug;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            {organization?.name ?? brand.name}
          </Link>
          <nav className="ml-4 hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <Link href="/" className="hover:text-foreground">
              Menu
            </Link>
            {userId && slug ? (
              <>
                <Link href={`/store/${slug}/orders`} className="hover:text-foreground">
                  My purchases
                </Link>
                <Link href={`/store/${slug}/received`} className="hover:text-foreground">
                  Past purchased
                </Link>
              </>
            ) : null}
            {isStaff ? (
              <Link href="/dashboard" className="hover:text-foreground">
                Manage
              </Link>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            {slug ? (
              <Button variant="outline" render={<Link href={`/store/${slug}/cart`} />}>
                Cart{cartCount ? ` (${cartCount})` : ""}
              </Button>
            ) : null}
            {isStaff ? (
              <Button variant="ghost" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
            ) : null}
            {userId ? (
              <>
                <Button variant="ghost" render={<Link href={slug ? `/store/${slug}/account` : "/login"} />}>
                  Account
                </Button>
                <SignOutButton />
              </>
            ) : (
              <Button render={<Link href="/login" />}>Sign in</Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
