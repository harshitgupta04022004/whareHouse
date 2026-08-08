"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff";
  warehouseId: string;
  warehouseName: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  /** Logged in via Supabase Auth but no warehouse membership yet */
  needsOnboarding: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  const resolveAppUser = useCallback(async (s: Session): Promise<AppUser | null> => {
    const { data, error } = await supabase
      .from("app_users")
      .select("user_id, email, name, role, warehouse_id")
      .eq("user_id", s.user.id)
      .maybeSingle();

    if (error || !data) return null;

    const { data: warehouse } = await supabase
      .from("warehouses")
      .select("name")
      .eq("warehouse_id", data.warehouse_id)
      .maybeSingle();

    return {
      id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role as "admin" | "manager" | "staff",
      warehouseId: data.warehouse_id,
      warehouseName: warehouse?.name ?? "Warehouse",
    };
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        setUser(await resolveAppUser(s));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) {
        setUser(await resolveAppUser(s));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, resolveAppUser]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    setSession(s);
    if (!s) {
      setUser(null);
      return null;
    }
    const appUser = await resolveAppUser(s);
    setUser(appUser);
    return appUser;
  }, [supabase, resolveAppUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg =
          error.message === "Invalid login credentials"
            ? "Invalid email or password"
            : error.message;
        return { error: msg };
      }
      return {};
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        const message = error.message.toLowerCase().includes("rate limit")
          ? "Supabase temporarily blocked signup emails. If this account already exists, use Sign in. Otherwise wait a few minutes and try again."
          : error.message;
        return { error: message };
      }
      return {};
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [supabase]);

  const needsOnboarding = Boolean(session && !user);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        needsOnboarding,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
