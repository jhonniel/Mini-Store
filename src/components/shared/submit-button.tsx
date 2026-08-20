"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

export function SubmitButton({
  children,
  className,
  variant,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size}>
      {pending ? <Loader2Icon className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
