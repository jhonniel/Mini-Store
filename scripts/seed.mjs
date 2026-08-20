import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.

Add them to .env.local, then run: npm run seed

Or paste this into the Supabase SQL editor after running the migrations:

  select * from public.seed_demo_accounts();

Demo logins:
  Admin  admin@example.com  Password123!
  User   user@example.com   Password123!
`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.rpc("seed_demo_accounts");
if (error) {
  console.error("Seed failed:", error.message);
  console.error("Make sure migrations 00001–00005 are applied in Supabase.");
  process.exit(1);
}

console.log("Seeded demo accounts:");
console.table(data ?? [
  { role: "admin", email: "admin@example.com", password: "Password123!" },
  { role: "user", email: "user@example.com", password: "Password123!" },
]);
