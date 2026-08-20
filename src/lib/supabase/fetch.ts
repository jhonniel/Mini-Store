type FetchInit = Parameters<typeof fetch>[1] & { duplex?: "half" };

export function supabaseRequestInit(init?: FetchInit): FetchInit {
  const nextInit: FetchInit = {
    ...init,
    cache: "no-store",
  };
  if (init?.body != null) {
    nextInit.duplex = "half";
  }
  return nextInit;
}

export function wrapNetworkError(error: unknown): Error {
  const cause =
    error instanceof Error && "cause" in error
      ? (error as Error & { cause?: { code?: string; message?: string } }).cause
      : undefined;
  const detail =
    [cause?.code, cause?.message].filter(Boolean).join(": ") ||
    (error instanceof Error ? error.message : "network error");
  return new TypeError(`Cannot reach Supabase (${detail})`, { cause: error as Error });
}

/** Edge-safe fetch that skips Next.js Data Cache. */
export const supabaseEdgeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, supabaseRequestInit(init));
  } catch (error) {
    throw wrapNetworkError(error);
  }
};
