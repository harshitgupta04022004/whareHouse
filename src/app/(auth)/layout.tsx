"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, session, loading, needsOnboarding } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Password recovery/invite creates a temporary session — do NOT send those users to /challans
  const [isRecoveryFlow] = useState(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash;
    return (
      pathname === "/reset-password" ||
      hash.includes("type=recovery") ||
      hash.includes("type=invite") ||
      sessionStorage.getItem("resetRedirect") === "1"
    );
  });

  const allowAuthedSession = isRecoveryFlow || pathname === "/reset-password";

  useEffect(() => {
    if (loading) return;
    // Stay on reset-password while the user sets a new password
    if (allowAuthedSession) return;
    if (user) {
      router.replace("/challans");
      return;
    }
    if (needsOnboarding || (session && !user)) {
      router.replace("/onboarding");
    }
  }, [user, session, loading, needsOnboarding, router, allowAuthedSession]);

  if (loading) {
    return (
      <div className="aurora relative flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px] animate-rise">
          <div className="mb-6 flex justify-center">
            <div className="w-9 h-9 rounded-[11px] bg-brand flex items-center justify-center animate-pulse">
              <svg
                className="w-5 h-5 text-brand-ink"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Already signed in — redirecting away (except during password reset)
  if (!allowAuthedSession && (user || session)) return null;

  return (
    <div className="aurora relative flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] animate-rise">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-brand text-brand-ink shadow-[var(--shadow-sm)]">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M3 7v6l9 4 9-4V7" />
                <path d="M12 11v10" />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">
                Radheshyam Warehouse
              </div>
              <div className="text-[11px] font-medium text-ink-faint">
                DO Records &middot; Goods &amp; Warehouse
              </div>
            </div>
          </div>
        </div>
        {children}
        <p className="mt-6 text-center text-[12px] text-ink-faint">
          Secure DO management &middot; बैग, वज़न और सारांश
        </p>
      </div>
    </div>
  );
}
