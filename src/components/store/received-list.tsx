"use client";

import { useState } from "react";
import { confirmReceived } from "@/lib/actions/commerce";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { OrderItem } from "@/types";

export function ReceivedList({
  slug,
  orderId,
  items,
}: {
  slug: string;
  orderId: string;
  items: OrderItem[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={Boolean(item.received_at)}
            checked={Boolean(item.received_at) || selected.includes(item.id)}
            onChange={(e) => {
              setSelected((prev) =>
                e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
              );
            }}
          />
          <span>
            {item.product_name} × {item.quantity}
            {item.received_at ? ` · received ${new Date(item.received_at).toLocaleString()}` : ""}
          </span>
        </label>
      ))}
      <Button
        disabled={selected.length === 0}
        onClick={async () => {
          const result = await confirmReceived(slug, orderId, selected);
          if (result.error) toast.error(result.error);
          else {
            toast.success(result.success);
            setSelected([]);
          }
        }}
      >
        Confirm received
      </Button>
    </div>
  );
}
