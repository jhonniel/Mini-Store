"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export function SalesChart({
  data,
  currency,
}: {
  data: Array<{ date: string; total: number }>;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales overview</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
              <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfitChart({
  revenue,
  cost,
  profit,
  currency,
}: {
  revenue: number;
  cost: number;
  profit: number;
  currency: string;
}) {
  const data = [
    { name: "Revenue", value: revenue },
    { name: "Cost", value: cost },
    { name: "Profit", value: profit },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit overview</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
