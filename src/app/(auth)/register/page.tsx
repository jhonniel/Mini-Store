import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; invite?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Create an account"
      description="One account for everyone. After you sign in, your role controls whether you shop or manage the store."
    >
      <RegisterForm slug={params.slug} invite={params.invite} />
      <p className="mt-6 text-center text-sm text-white/55">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#7ddea8] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
