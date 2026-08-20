"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardRanges, type DateRangeKey } from "@/lib/constants";

export function RangeSelect({ value }: { value: DateRangeKey }) {
  const router = useRouter();
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) router.push(`/dashboard?range=${next}`);
      }}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {dashboardRanges.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
