"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importProductsCsv } from "@/lib/actions/products";

const TEMPLATE = "Item name,Category,Price,Quantity\nCoca-Cola 1.5L,Beverages,85,24\nJasmine Rice 25kg,Rice & Staples,1450,10\n";

export function CsvImportCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "menu-items-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || !file.size) {
      toast.error("Choose a CSV file first.");
      return;
    }
    setPending(true);
    try {
      const result = await importProductsCsv(new FormData(form));
      if (result.error) toast.error(result.error);
      else toast.success(result.success ?? "Items imported to the menu.");
      form.reset();
      setFileName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="font-medium">Upload a CSV to the menu</p>
          <p className="text-sm text-muted-foreground">
            Columns: <span className="font-medium text-foreground">Item name, Category, Price, Quantity</span>.
            New categories are created automatically. Active items show on the customer menu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={downloadTemplate}>
            Download template
          </Button>
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            {fileName || "Choose CSV"}
          </Button>
          <Button type="submit" disabled={pending}>
            <UploadIcon />
            {pending ? "Importing..." : "Import items"}
          </Button>
        </div>
      </div>
    </form>
  );
}
