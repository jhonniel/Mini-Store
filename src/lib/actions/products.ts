"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth/session";
import { csvField, csvNumber, parseCsv } from "@/lib/csv";
import { getErrorMessage, slugify } from "@/lib/utils";
import { categorySchema, inventoryAdjustSchema, productSchema } from "@/lib/validations/product";
import { takeUploadedImage } from "@/lib/s3";

function revalidateCatalog(slug: string) {
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath(`/store/${slug}`);
}

export async function createCategory(formData: FormData) {
  const ctx = await requireWorkspace("products.create");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create category." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.from("categories").insert({
    organization_id: ctx.organization.id,
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    description: parsed.data.description || null,
  });

  if (error) return { error: getErrorMessage(error, "Unable to create category.") };
  revalidateCatalog(ctx.organization.slug);
  return { success: "Category created." };
}

export async function createProduct(formData: FormData) {
  const ctx = await requireWorkspace("products.create");
  const image = await takeUploadedImage(formData, ctx.organization.id, {
    fileField: "image",
    urlField: "imageUrl",
    folder: "products",
  });
  if (image.error) return { error: image.error };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    barcode: formData.get("barcode") || undefined,
    categoryId: formData.get("categoryId") || "",
    description: formData.get("description") || undefined,
    imageUrl: image.url || undefined,
    unit: formData.get("unit") || "piece",
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    currentStock: formData.get("currentStock") || 0,
    minStock: formData.get("minStock") || ctx.settings?.default_min_stock || 0,
    maxStock: formData.get("maxStock") || undefined,
    status: formData.get("status") || "active",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create product." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const initialStock = parsed.data.currentStock ?? 0;

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: ctx.organization.id,
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      selling_price: parsed.data.sellingPrice,
      current_stock: 0,
      min_stock: parsed.data.minStock,
      max_stock: parsed.data.maxStock || null,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: getErrorMessage(error, "Unable to create product. Please try again.") };
  }

  if (initialStock > 0) {
    const { error: stockError } = await supabase.rpc("adjust_inventory", {
      p_product_id: data.id,
      p_quantity: initialStock,
      p_type: "initial",
      p_notes: "Initial stock",
    });
    if (stockError) {
      return { error: getErrorMessage(stockError, "Product created, but initial stock could not be set.") };
    }
  }

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: "product.created",
    entity_type: "product",
    entity_id: data.id,
    description: `Product ${parsed.data.name} created`,
  });

  revalidateCatalog(ctx.organization.slug);
  return { success: "Product created.", id: data.id };
}

export async function updateProduct(productId: string, formData: FormData) {
  const ctx = await requireWorkspace("products.edit");
  const image = await takeUploadedImage(formData, ctx.organization.id, {
    fileField: "image",
    urlField: "imageUrl",
    folder: "products",
  });
  if (image.error) return { error: image.error };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    barcode: formData.get("barcode") || undefined,
    categoryId: formData.get("categoryId") || "",
    description: formData.get("description") || undefined,
    imageUrl: image.url || undefined,
    unit: formData.get("unit") || "piece",
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    minStock: formData.get("minStock") || 0,
    maxStock: formData.get("maxStock") || undefined,
    status: formData.get("status") || "active",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update product." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      selling_price: parsed.data.sellingPrice,
      min_stock: parsed.data.minStock,
      max_stock: parsed.data.maxStock || null,
      status: parsed.data.status,
    })
    .eq("id", productId)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: getErrorMessage(error, "Unable to update product. Please try again.") };

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: "product.updated",
    entity_type: "product",
    entity_id: productId,
    description: `Product ${parsed.data.name} updated`,
  });

  revalidateCatalog(ctx.organization.slug);
  revalidatePath(`/dashboard/products/${productId}`);
  return { success: "Product updated." };
}

export async function archiveProduct(productId: string) {
  const ctx = await requireWorkspace("products.delete");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived", deleted_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: getErrorMessage(error, "Unable to archive product.") };

  await supabase.from("audit_logs").insert({
    organization_id: ctx.organization.id,
    user_id: ctx.user.id,
    action: "product.archived",
    entity_type: "product",
    entity_id: productId,
    description: "Product archived",
  });

  revalidateCatalog(ctx.organization.slug);
  return { success: "Product archived." };
}

export async function bulkArchiveProducts(productIds: string[]) {
  const ctx = await requireWorkspace("products.delete");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived", deleted_at: new Date().toISOString() })
    .in("id", productIds)
    .eq("organization_id", ctx.organization.id);
  if (error) return { error: getErrorMessage(error, "Unable to archive products.") };
  revalidateCatalog(ctx.organization.slug);
  return { success: `${productIds.length} products archived.` };
}

export async function adjustInventory(formData: FormData) {
  const ctx = await requireWorkspace("inventory.adjust");
  const parsed = inventoryAdjustSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    type: formData.get("type"),
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to adjust inventory." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("adjust_inventory", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_type: parsed.data.type,
    p_notes: parsed.data.notes || null,
  });
  if (error) return { error: getErrorMessage(error, "Unable to adjust inventory.") };
  revalidateCatalog(ctx.organization.slug);
  return { success: "Inventory updated." };
}

export async function importProductsCsv(formData: FormData) {
  const ctx = await requireWorkspace("products.create");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file with item name, category, price, and quantity." };
  }
  if (file.size > 2_000_000) {
    return { error: "CSV file is too large. Keep it under 2 MB." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length === 0) {
    return { error: "The CSV is empty. Add a header row and at least one item." };
  }
  if (rows.length > 500) {
    return { error: "Import up to 500 rows at a time." };
  }

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: existingCategories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null);

  const categoriesByName = new Map(
    (existingCategories ?? []).map((category) => [category.name.trim().toLowerCase(), category.id])
  );
  const categoriesBySlug = new Map((existingCategories ?? []).map((category) => [category.slug, category.id]));

  async function categoryIdFor(name: string) {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    const existing = categoriesByName.get(key);
    if (existing) return existing;
    const slug = slugify(name) || `category-${categoriesByName.size + 1}`;
    const slugHit = categoriesBySlug.get(slug);
    if (slugHit) {
      categoriesByName.set(key, slugHit);
      return slugHit;
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({
        organization_id: ctx.organization.id,
        name: name.trim(),
        slug,
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    categoriesByName.set(key, data.id);
    categoriesBySlug.set(slug, data.id);
    return data.id;
  }

  let created = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [index, row] of rows.entries()) {
    const name = csvField(row, ["item name", "item", "name", "product", "product name"]);
    if (!name) {
      skipped += 1;
      continue;
    }
    const categoryName = csvField(row, ["category", "categories", "cat"]);
    const price = csvNumber(csvField(row, ["price", "selling price", "selling_price", "unit price"]));
    const quantity = csvNumber(csvField(row, ["quantity", "qty", "stock", "current stock", "current_stock"]));
    const cost = csvNumber(csvField(row, ["cost", "cost price", "cost_price"])) || 0;
    const categoryId = categoryName ? await categoryIdFor(categoryName) : null;

    const { data, error } = await supabase
      .from("products")
      .insert({
        organization_id: ctx.organization.id,
        category_id: categoryId,
        name,
        unit: "piece",
        cost_price: cost,
        selling_price: price,
        current_stock: 0,
        min_stock: 0,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) {
      failures.push(`Row ${index + 2}: ${name}`);
      continue;
    }

    if (quantity > 0) {
      const { error: stockError } = await supabase.rpc("adjust_inventory", {
        p_product_id: data.id,
        p_quantity: quantity,
        p_type: "initial",
        p_notes: "CSV import",
      });
      if (stockError) {
        failures.push(`Row ${index + 2}: ${name} added, but stock was not set`);
      }
    }

    created += 1;
  }

  if (created > 0) {
    await supabase.from("audit_logs").insert({
      organization_id: ctx.organization.id,
      user_id: ctx.user.id,
      action: "product.imported",
      entity_type: "product",
      description: `Imported ${created} products from CSV`,
    });
  }

  revalidateCatalog(ctx.organization.slug);

  if (created === 0) {
    return { error: failures[0] ?? "No products were imported. Check the CSV headers and rows." };
  }

  const extra = [
    skipped ? `${skipped} empty row(s) skipped` : null,
    failures.length ? `${failures.length} row(s) had issues` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    success: extra ? `Imported ${created} item(s) to the menu. ${extra}.` : `Imported ${created} item(s) to the menu.`,
  };
}

export async function seedCatalog() {
  const ctx = await requireWorkspace();
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase.rpc("seed_demo_catalog", { p_org: ctx.organization.id });
  if (error) return { error: getErrorMessage(error, "Unable to load sample products.") };
  revalidateCatalog(ctx.organization.slug);
  revalidatePath("/dashboard");
  return { success: "Sample grocery catalog loaded." };
}
