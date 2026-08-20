"use client";

import { useState } from "react";
import { adjustInventory } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { SubmitButton } from "@/components/shared/submit-button";
import { toast } from "sonner";

export function AdjustStockDialog({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("added");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Adjust</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust {productName}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          action={async (formData) => {
            const result = await adjustInventory(formData);
            if (result.error) toast.error(result.error);
            else {
              toast.success(result.success);
              setOpen(false);
            }
          }}
        >
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="type" value={type} />
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value ?? "added")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="added">Stock added</SelectItem>
                <SelectItem value="manual">Manual adjustment</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`qty-${productId}`}>Quantity (use negative to remove)</Label>
            <Input id={`qty-${productId}`} name="quantity" type="number" step="0.001" required />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea name="notes" rows={3} />
          </div>
          <SubmitButton>Save movement</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
