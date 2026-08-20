"use server";

import { revalidatePath } from "next/cache";
import { type PermissionKey } from "@/config/permissions";
import { requireWorkspace } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/utils";
import { takeUploadedImage, uploadGeneratedQr } from "@/lib/s3";

export async function updateBusinessSettings(formData: FormData) {
  const ctx = await requireWorkspace("settings.manage");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const logo = await takeUploadedImage(formData, ctx.organization.id, {
    fileField: "logo",
    urlField: "logoUrl",
    folder: "logos",
  });
  if (logo.error) return { error: logo.error };

  const { error: orgError } = await supabase
    .from("organizations")
    .update({
      name: String(formData.get("name") || ctx.organization.name),
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      address: String(formData.get("address") || "") || null,
      currency: String(formData.get("currency") || "PHP"),
      logo_url: logo.url,
    })
    .eq("id", ctx.organization.id);

  if (orgError) return { error: getErrorMessage(orgError, "Unable to save business settings.") };

  const { error } = await supabase
    .from("business_settings")
    .update({
      allow_pay_later: formData.get("allowPayLater") === "on",
      allow_negative_stock: formData.get("allowNegativeStock") === "on",
      default_min_stock: Number(formData.get("defaultMinStock") || 5),
      require_customer_confirmation: formData.get("requireCustomerConfirmation") === "on",
      default_order_status: String(formData.get("defaultOrderStatus") || "pending"),
      payment_terms_days: Number(formData.get("paymentTermsDays") || 7),
      allow_customer_self_checkout: formData.get("allowCustomerSelfCheckout") === "on",
      low_stock_notifications: formData.get("lowStockNotifications") === "on",
    })
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: getErrorMessage(error, "Unable to save settings.") };
  revalidatePath("/dashboard/settings");
  return { success: "Settings saved." };
}

export async function inviteStaff(formData: FormData) {
  const ctx = await requireWorkspace("staff.manage");
  const email = String(formData.get("email") || "").trim();
  const role = String(formData.get("role") || "staff");
  if (!email) return { error: "Enter an email address." };

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("invites").insert({
    organization_id: ctx.organization.id,
    email,
    role,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: ctx.user.id,
  });
  if (error) return { error: getErrorMessage(error, "Unable to create invite.") };
  revalidatePath("/dashboard/staff");
  return {
    success: "Invite created.",
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/register?invite=${token}`,
  };
}

export async function updateStaffPermissions(memberId: string, permissions: Record<PermissionKey, boolean>) {
  const ctx = await requireWorkspace("staff.manage");
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ permissions })
    .eq("id", memberId)
    .eq("organization_id", ctx.organization.id);
  if (error) return { error: getErrorMessage(error, "Unable to update permissions.") };
  revalidatePath("/dashboard/staff");
  return { success: "Permissions updated." };
}

export async function markNotificationsRead() {
  const ctx = await requireWorkspace();
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id)
    .is("read_at", null);
  revalidatePath("/dashboard");
}

export async function addPaymentMethod(formData: FormData) {
  const ctx = await requireWorkspace("settings.manage");
  const kind = String(formData.get("kind") || "other");
  const name = String(formData.get("name") || (kind === "gcash" ? "GCash" : kind === "cash" ? "Cash" : "")).trim();
  const accountNumber = String(formData.get("accountNumber") || "").trim() || null;
  if (!name) return { error: "Enter a payment method name." };
  if (kind === "gcash" && !accountNumber) return { error: "Enter the GCash account number." };

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: existing } = await supabase
    .from("payment_methods")
    .select("id, qr_code_url")
    .eq("organization_id", ctx.organization.id)
    .eq("kind", kind)
    .limit(1)
    .maybeSingle();

  let qrCodeUrl = existing?.qr_code_url ?? null;
  if (kind === "gcash") {
    const uploaded = await takeUploadedImage(formData, ctx.organization.id, {
      fileField: "qrCode",
      urlField: "qrCodeUrl",
      folder: "payments",
    });
    if (uploaded.error) return { error: uploaded.error };
    qrCodeUrl = uploaded.url ?? existing?.qr_code_url ?? null;
    if (!qrCodeUrl && accountNumber) {
      const generated = await uploadGeneratedQr(accountNumber, ctx.organization.id);
      qrCodeUrl = generated.url;
    }
  }

  const payload = {
    organization_id: ctx.organization.id,
    name,
    kind,
    account_number: kind === "gcash" ? accountNumber : null,
    qr_code_url: kind === "gcash" ? qrCodeUrl : null,
    is_active: true,
  };

  const { error } = existing
    ? await supabase.from("payment_methods").update(payload).eq("id", existing.id)
    : await supabase.from("payment_methods").insert(payload);

  if (error) return { error: getErrorMessage(error, "Unable to save payment method.") };
  revalidatePath("/dashboard/settings");
  return { success: kind === "gcash" ? "GCash details saved." : "Cash payment method saved." };
}
