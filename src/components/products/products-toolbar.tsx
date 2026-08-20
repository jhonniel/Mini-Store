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
import { Button } from "@/components/ui/button";
import { importProductsCsv } from "@/lib/actions/products";
import { toast } from "sonner";
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
      <Select value={category || "all"} onValueChange={(value) => push({ category: value === "all" ? "" : (value ?? "") })}>
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
      <div className="ml-auto flex gap-2">
        <Button variant="outline" render={<a href="/api/export/products" />}>
          Export CSV
        </Button>
        <label className="inline-flex">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
              const headers = headerLine.split(",").map((h) => h.trim());
              const rows = lines.map((line) => {
                const cols = line.split(",");
                return Object.fromEntries(headers.map((h, i) => [h, cols[i]?.trim() ?? ""]));
              });
              const result = (await importProductsCsv(rows)) as { error?: string; success?: string };
              if (result.error) toast.error(result.error);
              else toast.success(result.success ?? "Imported products.");
            }}
          />
          <Button variant="outline" type="button">
            Import CSV
          </Button>
        </label>
      </div>
    </div>
  );
}
