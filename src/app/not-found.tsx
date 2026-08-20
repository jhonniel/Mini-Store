import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you requested does not exist.</p>
      <Button className="mt-6" render={<Link href="/" />}>
        Go home
      </Button>
    </div>
  );
}
