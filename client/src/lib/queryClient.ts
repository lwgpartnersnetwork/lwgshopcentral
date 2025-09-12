// client/src/lib/queryClient.ts
import { QueryClient, QueryFunction, QueryKey } from "@tanstack/react-query";

/** Base URL for your API. If empty, the app will call the same origin. */
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

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
function appendParams(sp: URLSearchParams, obj: Record<string, any>) {
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => sp.append(k, String(item)));
    } else {
      sp.append(k, String(v));
    }
  });
}

/** Build a request URL from a TanStack queryKey. */
function buildUrlFromQueryKey(queryKey: QueryKey): string {
  // Common patterns we support:
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
        appendParams(sp, part as Record<string, any>);
      }
    }

    const pathWithQuery =
      u.pathname + (sp.toString() ? `?${sp.toString()}` : "");
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
    headers: data
      ? { "Content-Type": "application/json", ...headers }
      : { ...headers },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/** Generic queryFn that understands our queryKey shapes and base URL. */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // @ts-expect-error - caller expects T | null in this mode
      return null;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as any;
  };

/** Shared QueryClient with sensible defaults for our app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: false,
      refetchInterval: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
