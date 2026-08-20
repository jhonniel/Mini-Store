import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Organization } from "@/types";

export function StoreHeader({
  organization,
  cartCount = 0,
  isStaff = false,
  signedIn = false,
}: {
  organization: Pick<Organization, "name" | "slug">;
  cartCount?: number;
  isStaff?: boolean;
  signedIn?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          {organization.name}
        </Link>
        <nav className="ml-4 hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          <Link href="/">Menu</Link>
          <Link href={`/store/${organization.slug}/orders`}>My purchases</Link>
          <Link href={`/store/${organization.slug}/received`}>Past purchased</Link>
          <Link href={`/store/${organization.slug}/account`}>Account</Link>
          {isStaff ? <Link href="/dashboard">Manage</Link> : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <Button variant="outline" render={<Link href={`/store/${organization.slug}/cart`} />}>
            Cart{cartCount ? ` (${cartCount})` : ""}
          </Button>
          {signedIn ? (
            <SignOutButton />
          ) : (
            <Button render={<Link href="/login" />}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
