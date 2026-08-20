import { Agent, request } from "undici";
import { wrapNetworkError } from "@/lib/supabase/fetch";

const dispatcher = new Agent({
  allowH2: false,
  autoSelectFamily: false,
  connect: {
    family: 4,
    timeout: 10_000,
  },
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestHeaders(init?: RequestInit): Record<string, string> {
  const headers = new Headers(init?.headers);
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function requestBody(init?: RequestInit) {
  const body = init?.body;
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return body;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) return body;
  if (body instanceof URLSearchParams) return body.toString();
  throw new Error("Unsupported request body type for Supabase fetch");
}

/** Node HTTP that bypasses Next.js patched `fetch` — required for auth POSTs. */
export const supabaseNodeFetch: typeof fetch = async (input, init) => {
  const url = requestUrl(input);
  const method = (init?.method ?? "GET").toUpperCase();
  try {
    const { statusCode, headers, body } = await request(url, {
      method,
      headers: requestHeaders(init),
      body: requestBody(init),
      dispatcher,
    });
    const text = await body.text();
    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      if (value == null) continue;
      responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }
    return new Response(text, { status: statusCode, headers: responseHeaders });
  } catch (error) {
    console.error("[supabase]", method, url, error);
    throw wrapNetworkError(error);
  }
};
