export const units = ["piece", "kg", "g", "L", "ml", "pack", "box", "sack", "dozen", "bundle"] as const;

export const dashboardRanges = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
] as const;

export type DateRangeKey = (typeof dashboardRanges)[number]["value"];

export const orderStatuses = [
  "draft",
  "pending",
  "confirmed",
  "processing",
  "ready",
  "completed",
  "cancelled",
  "returned",
] as const;
