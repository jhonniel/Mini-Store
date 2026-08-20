"use client";

import { useMemo, useState } from "react";
import { createBusiness } from "@/lib/actions/auth";
import { slugify } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const slug = useMemo(() => slugify(name), [name]);

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Set up your business</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This creates an isolated workspace for your products, customers, and sales.
      </p>
      <form
        action={async (formData) => {
          const result = await createBusiness(formData);
          if (result?.error) toast.error(result.error);
        }}
        className="mt-8 space-y-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Business name</Label>
          <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dela Cruz Grocery" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Store URL</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/store/</span>
            <Input id="slug" name="slug" required value={slug} readOnly />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Business email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={3} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="seed" defaultChecked className="size-4 rounded border" />
          Load sample grocery products (Rice, Coca-Cola, Coffee, and more)
        </label>
        <SubmitButton className="w-full">Create workspace</SubmitButton>
      </form>
    </div>
  );
}
