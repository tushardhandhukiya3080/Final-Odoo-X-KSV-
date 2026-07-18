import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Org, User } from "../lib/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  org: Org | null;
  setSession: (p: { accessToken: string; refreshToken: string; user: User; org?: Org | null }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User, org?: Org | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      org: null,
      setSession: ({ accessToken, refreshToken, user, org }) =>
        set({ accessToken, refreshToken, user, org: org ?? null }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user, org) => set((s) => ({ user, org: org ?? s.org })),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, org: null }),
    }),
    { name: "carpool-auth" }
  )
);
