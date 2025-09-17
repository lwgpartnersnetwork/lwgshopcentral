// client/src/lib/queryClient.ts
import { QueryClient, type QueryFunction, type QueryKey } from "@tanstack/react-query";

/** Base URL for your API. If empty, the app will call the same origin. */
const API_BASE = String(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** Throw a helpful error if the fetch response is not ok. */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/** Prefix URL with API_BASE unless it's already absolute. */
function toAbsoluteUrl(url: string): string {
  const isAbsolute = /^https?:\/\//i.test(url);
  return isAbsolute ? url : `${API_BASE}${url}`;
}

/** Append plain-object key/values to URLSearchParams (arrays supported). */
function appendParams(sp: URLSearchParams, obj: Record<string, unknown>) {
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => sp.append(k, String(item)));
    } else if (typeof v === "object") {
      sp.append(k, JSON.stringify(v)); // flatten simple objects
    } else {
      sp.append(k, String(v));
    }
  });
}

/** Build a request URL from a TanStack queryKey. */
function buildUrlFromQueryKey(queryKey: QueryKey): string {
  // Supported shapes:
  // - "/api/products"
  // - ["/api/products"]
  // - ["/api/products", { categoryId: "123", q: "laptop" }]
  // - ["/api/products?limit=20", { page: 2 }]
  if (typeof queryKey === "string") {
    return toAbsoluteUrl(queryKey);
  }

  if (Array.isArray(queryKey) && typeof queryKey[0] === "string") {
    const base = queryKey[0] as string;

    // Use dummy origin to safely parse existing query in base
    const u = new URL(base, "http://dummy");
    const sp = new URLSearchParams(u.search);

    // Merge any subsequent plain-object params
    for (let i = 1; i < queryKey.length; i++) {
      const part = queryKey[i];
      if (part && typeof part === "object" && !Array.isArray(part)) {
        appendParams(sp, part as Record<string, unknown>);
      }
    }

    const pathWithQuery = u.pathname + (sp.toString() ? `?${sp.toString()}` : "");
    return toAbsoluteUrl(pathWithQuery);
  }

  // Fallback (shouldn't happen in our app)
  return toAbsoluteUrl(String(queryKey));
}

/** Simple helper for imperative API calls (POST/PUT/DELETE/GET). */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const absoluteUrl = toAbsoluteUrl(url);
  const res = await fetch(absoluteUrl, {
    method,
    headers: data ? { "Content-Type": "application/json", ...headers } : { ...headers },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/** Overloads so TS knows when null is possible */
export function getQueryFn<T>(options: { on401: "throw" }): QueryFunction<T>;
export function getQueryFn<T>(options: { on401: "returnNull" }): QueryFunction<T | null>;
export function getQueryFn<T>({ on401 }: { on401: UnauthorizedBehavior }) {
  const fn: QueryFunction<T | null> = async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };

  // Overload at call site refines to T or T | null.
  return fn as unknown as QueryFunction<T>;
}

/** Shared QueryClient with sensible defaults for our app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: Infinity, // override per-query if needed
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
