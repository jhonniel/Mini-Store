import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">You don&apos;t have permission to access this page.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This area is for store admins and staff. Sign in with the same login — your role decides what you can see on the menu.
      </p>
      <div className="mt-6 flex gap-2">
        <Button render={<Link href="/" />}>Go home</Button>
        <Button variant="outline" render={<Link href="/login" />}>
          Sign in
        </Button>
      </div>
    </div>
  );
}
