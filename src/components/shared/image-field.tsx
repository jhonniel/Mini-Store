"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImageField({
  label,
  fileField,
  urlField,
  currentUrl,
  hint,
}: {
  label: string;
  fileField: string;
  urlField: string;
  currentUrl?: string | null;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview || currentUrl || null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={fileField}>{label}</Label>
      {shown ? (
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="mx-auto max-h-48 object-contain" />
        </div>
      ) : null}
      {currentUrl ? <input type="hidden" name={urlField} value={currentUrl} /> : null}
      <Input
        id={fileField}
        name={fileField}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
      <p className="text-xs text-muted-foreground">{hint ?? "Saved to S3. JPG, PNG, WEBP, or GIF, up to 5 MB."}</p>
    </div>
  );
}
