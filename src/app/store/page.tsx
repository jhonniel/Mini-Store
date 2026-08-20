import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

export default async function StoreIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("organizations").select("name, slug").is("deleted_at", null).order("name").limit(24);
  if (q) query = query.ilike("slug", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold">Find a store</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Open a {brand.name} storefront by its URL slug.
      </p>
      <form className="mt-6 flex gap-2">
        <Input name="q" placeholder="your-store" defaultValue={q} />
        <Button type="submit">Search</Button>
      </form>
      <div className="mt-6 space-y-2">
        {(data ?? []).map((org) => (
          <Link key={org.slug} href={`/store/${org.slug}`} className="block rounded-lg border p-3 hover:bg-muted/40">
            {org.name}
            <span className="ml-2 text-sm text-muted-foreground">/store/{org.slug}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
