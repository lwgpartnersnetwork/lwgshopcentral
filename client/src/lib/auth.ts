// client/src/lib/auth.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

/* ---------------- Types ---------------- */
type Role = "customer" | "vendor" | "admin";

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role; // default: "customer"
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

/* -------- Normalize server payload -> User -------- */
function normalizeUser(raw: any): User {
  const roleRaw = raw?.role ?? raw?.userRole ?? "customer";
  const role = (["customer", "vendor", "admin"].includes(roleRaw)
    ? roleRaw
    : "customer") as Role;

  return {
    id: String(raw?.id ?? ""),
    email: String(raw?.email ?? ""),
    firstName: String(raw?.firstName ?? raw?.first_name ?? ""),
    lastName: String(raw?.lastName ?? raw?.last_name ?? ""),
    role,
  } as User;
}

/* ---------------- Store ---------------- */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      /* Login -> POST /api/auth/login */
      async login(email: string, password: string) {
        const res = await apiRequest("POST", "/api/auth/login", { email, password });
        // apiRequest throws on non-2xx, so if we’re here it's OK.
        const raw = await res.json().catch(() => ({}));
        const user = normalizeUser(raw);
        if (!user.id || !user.email) {
          throw new Error("Invalid login response");
        }
        set({ user, isAuthenticated: true });
      },

      /* Register -> POST /api/auth/register */
      async register(data: RegisterData) {
        const payload = {
          email: data.email.trim().toLowerCase(),
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: (data.role ?? "customer") as Role,
        };

        const res = await apiRequest("POST", "/api/auth/register", payload);
        const raw = await res.json().catch(() => ({}));
        const user = normalizeUser(raw);
        if (!user.id || !user.email) {
          throw new Error("Invalid register response");
        }
        set({ user, isAuthenticated: true });
      },

      /* Local-only logout (no server session to clear) */
      logout() {
        set({ user: null, isAuthenticated: false });
      },

      /* Manually set/clear user */
      setUser(user: User | null) {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Persist only what’s needed
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      version: 1,
    },
  ),
);
