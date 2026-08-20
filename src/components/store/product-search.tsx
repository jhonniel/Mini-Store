"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export function ProductSearch({
  basePath = "/",
  query,
  category,
  sort,
  categories,
}: {
  basePath?: string;
  slug?: string;
  query: string;
  category: string;
  sort: string;
  categories: Category[];
}) {
  const router = useRouter();
  function push(next: Record<string, string>) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const cat = next.category ?? category;
    const s = next.sort ?? sort;
    if (q) params.set("q", q);
    if (cat) params.set("category", cat);
    if (s) params.set("sort", s);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <Input
          defaultValue={query}
          placeholder="Search products..."
          aria-label="Search products"
          onKeyDown={(e) => {
            if (e.key === "Enter") push({ q: (e.target as HTMLInputElement).value });
          }}
        />
        <Select value={sort || "category"} onValueChange={(value) => push({ sort: value ?? "category" })}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href={chipHref(basePath, { q: query, sort })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
            !category ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          All
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={chipHref(basePath, { q: query, category: item.id, sort })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
              category === item.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function chipHref(basePath: string, values: { q?: string; category?: string; sort?: string }) {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.category) params.set("category", values.category);
  if (values.sort) params.set("sort", values.sort);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
