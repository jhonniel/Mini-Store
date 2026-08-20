import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/money";
import { stockStatus } from "@/lib/utils";
import type { OrderStatus, PaymentStatus, ProductStatus } from "@/types";

export function StockRemaining({ current }: { current: string | number }) {
  const count = Math.max(0, Number(current) || 0);
  return (
    <span className="text-sm tabular-nums text-muted-foreground">
      {formatNumber(count, 0)} left
    </span>
  );
}

export function StockBadge({ current, min }: { current: string | number; min: string | number }) {
  const status = stockStatus(current, min);
  if (status === "out") {
    return <Badge variant="destructive">Out of stock</Badge>;
  }
  if (status === "low") {
    return (
      <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Low stock
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
      In stock
    </Badge>
  );
}

const paymentStyles: Record<PaymentStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  partially_paid: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  unpaid: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  overdue: "bg-destructive/10 text-destructive",
};

const orderStyles: Record<OrderStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  processing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  ready: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
  returned: "bg-muted text-muted-foreground",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge className={`border-transparent capitalize ${paymentStyles[status]}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={`border-transparent capitalize ${orderStyles[status]}`}>
      {status}
    </Badge>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  if (status === "archived") return <Badge variant="secondary">Archived</Badge>;
  if (status === "draft") return <Badge variant="outline">Draft</Badge>;
  return (
    <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
      Active
    </Badge>
  );
}
