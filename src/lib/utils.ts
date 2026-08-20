import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function getAuthErrorMessage(error: unknown, fallback = "Unable to sign in.") {
  const message = getErrorMessage(error, fallback);
  if (/fetch failed|Cannot reach Supabase|Failed to fetch|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return "Cannot reach Supabase. Check your internet connection and that NEXT_PUBLIC_SUPABASE_URL is set.";
  }
  return message;
}

export function stockStatus(current: string | number, min: string | number) {
  const stock = Number(current);
  const minimum = Number(min);
  if (stock <= 0) return "out" as const;
  if (stock <= minimum) return "low" as const;
  return "ok" as const;
}
