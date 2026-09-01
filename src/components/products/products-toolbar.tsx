"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/types";

export function ProductsToolbar({
  query,
  status,
  category,
  categories,
}: {
  query: string;
  status: string;
  category: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function push(next: Record<string, string>) {
    const params = new URLSearchParams({
      q: query,
      status,
      category,
      ...next,
    });
    startTransition(() => router.push(`/dashboard/products?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <Input
        defaultValue={query}
        placeholder="Search name, SKU, or barcode..."
        className="md:max-w-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            push({ q: (e.target as HTMLInputElement).value });
          }
        }}
      />
      <Select value={status} onValueChange={(value) => push({ status: value ?? "all" })}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={category || "all"}
        onValueChange={(value) => push({ category: value === "all" ? "" : (value ?? "") })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
