import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "ghost",
  className,
  children = "Sign out",
}: {
  variant?: "ghost" | "outline" | "default";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <form action="/auth/sign-out" method="post">
      <Button type="submit" variant={variant} className={className}>
        {children}
      </Button>
    </form>
  );
}
