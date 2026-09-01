"use client";

import { useMemo, useState } from "react";
import { ProfitPreview } from "@/components/shared/price-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { units } from "@/lib/constants";
import type { Category, Product } from "@/types";
import { SubmitButton } from "@/components/shared/submit-button";
import { ImageField } from "@/components/shared/image-field";
import { toast } from "sonner";

export function ProductForm({
  action,
  categories,
  product,
  currency = "PHP",
  includeStock = true,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | void>;
  categories: Category[];
  product?: Product | null;
  currency?: string;
  includeStock?: boolean;
}) {
  const [cost, setCost] = useState(product?.cost_price ?? "0");
  const [selling, setSelling] = useState(product?.selling_price ?? "0");
  const [unit, setUnit] = useState(product?.unit ?? "piece");
  const [status, setStatus] = useState(product?.status ?? "active");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "none");

  const preview = useMemo(() => ({ cost, selling }), [cost, selling]);

  return (
    <form
      action={async (formData) => {
        const result = await action(formData);
        if (result?.error) toast.error(result.error);
        if (result?.success) toast.success(result.success);
      }}
      className="grid gap-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="name">Product name</Label>
          <Input id="name" name="name" required defaultValue={product?.name} placeholder="Coca-Cola 1.5L" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} placeholder="COKE-15" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" defaultValue={product?.barcode ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="categoryId">Category</Label>
          <input type="hidden" name="categoryId" value={categoryId === "none" ? "" : categoryId} />
          <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit">Unit</Label>
          <input type="hidden" name="unit" value={unit} />
          <Select value={unit} onValueChange={(value) => setUnit(value ?? "piece")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="costPrice">Cost price (₱)</Label>
          <Input
            id="costPrice"
            name="costPrice"
            type="number"
            step="0.01"
            min="0"
            required
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sellingPrice">Selling price (₱)</Label>
          <Input
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            step="0.01"
            min="0"
            required
            value={selling}
            onChange={(e) => setSelling(e.target.value)}
          />
        </div>
        {includeStock ? (
          <div className="grid gap-2">
            <Label htmlFor="currentStock">Current stock</Label>
            <Input
              id="currentStock"
              name="currentStock"
              type="number"
              step="0.001"
              min="0"
              defaultValue={product?.current_stock ?? "0"}
            />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="minStock">Minimum stock</Label>
          <Input
            id="minStock"
            name="minStock"
            type="number"
            step="0.001"
            min="0"
            defaultValue={product?.min_stock ?? "0"}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxStock">Maximum stock</Label>
          <Input
            id="maxStock"
            name="maxStock"
            type="number"
            step="0.001"
            min="0"
            defaultValue={product?.max_stock ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <input type="hidden" name="status" value={status} />
          <Select value={status} onValueChange={(value) => setStatus((value as typeof status) ?? "active")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active — shown on the menu</SelectItem>
              <SelectItem value="draft">Draft — hidden from the menu</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <ImageField
            label="Product image"
            fileField="image"
            urlField="imageUrl"
            currentUrl={product?.image_url}
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={4} defaultValue={product?.description ?? ""} />
        </div>
      </div>
      <ProfitPreview cost={preview.cost} selling={preview.selling} currency={currency} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="reset">
          Reset
        </Button>
        <SubmitButton>{product ? "Save product" : "Add product"}</SubmitButton>
      </div>
    </form>
  );
}
