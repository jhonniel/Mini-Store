"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthErrorMessage, getErrorMessage, slugify } from "@/lib/utils";
import { resolveAppHome } from "@/lib/auth/home-path";
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  let home = "/";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      console.error("[signIn]", error.name, error.message);
      return { error: getAuthErrorMessage(error, error.message) };
    }
    if (!data.user) return { error: "No account found for that email." };
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      return { error: "This account is not in the store database. Ask an admin to add you first." };
    }
    home = await resolveAppHome(supabase, data.user.id, String(formData.get("next") || "/"));
  } catch (error) {
    return { error: getAuthErrorMessage(error) };
  }

  redirect(home);
}

export async function signUp(formData: FormData) {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent") || "business",
    storeSlug: formData.get("storeSlug") || undefined,
    invite: formData.get("invite") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create your account." };
  }

  let supabase;
  let userId: string | undefined;
  try {
    supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${appUrl()}/auth/callback`,
      },
    });
    if (error) return { error: getAuthErrorMessage(error, error.message) };
    userId = data.user?.id;
  } catch (error) {
    return { error: getAuthErrorMessage(error, "Unable to create your account.") };
  }

  if (parsed.data.invite) {
    await supabase.rpc("accept_invite", { p_token: parsed.data.invite });
  } else if (parsed.data.storeSlug) {
    await supabase.rpc("join_store_as_customer", { p_slug: parsed.data.storeSlug });
  }

  if (userId) {
    redirect(
      await resolveAppHome(
        supabase,
        userId,
        parsed.data.storeSlug ? `/store/${parsed.data.storeSlug}` : undefined
      )
    );
  }

  redirect(parsed.data.invite || parsed.data.storeSlug ? "/" : "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl()}/reset-password`,
    });
    if (error) return { error: getAuthErrorMessage(error, error.message) };
  } catch (error) {
    return { error: getAuthErrorMessage(error, "Unable to send a reset email.") };
  }
  return { success: "Check your email for a reset link." };
}

export async function updatePassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? await resolveAppHome(supabase, user.id) : "/");
}

export async function createBusiness(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    address: formData.get("address") || "",
    seed: formData.get("seed") === "on" || formData.get("seed") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create your business." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_email: parsed.data.email || null,
    p_phone: parsed.data.phone || null,
    p_address: parsed.data.address || null,
    p_seed: parsed.data.seed,
  });

  if (error) return { error: getErrorMessage(error, "Unable to create your business.") };

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("sf-org", String(data), { path: "/" });
  redirect("/dashboard");
}

export async function updateProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update profile." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq("id", user.id);

  if (error) return { error: getErrorMessage(error, "Unable to update profile.") };
  revalidatePath("/dashboard/settings");
  return { success: "Profile updated." };
}
