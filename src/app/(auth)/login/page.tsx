"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-lg)] sm:p-8">
      <div className="mb-6">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
          Welcome back
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Sign in to manage your DO records.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] px-3 py-2 rounded-[11px]">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="focus-ring h-11 w-full rounded-[11px] border border-border bg-surface-2 px-3.5 text-[14px] text-ink placeholder:text-ink-faint transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="focus-ring h-11 w-full rounded-[11px] border border-border bg-surface-2 px-3.5 text-[14px] text-ink placeholder:text-ink-faint transition-colors"
          />
        </div>

        <p className="-mt-1 text-right text-[12px] text-ink-faint">
          <Link href="/forgot-password" className="hover:text-ink-soft transition-colors">Forgot password?</Link>
        </p>

        <button
          type="submit"
          disabled={loading}
          className="focus-ring group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-brand text-[14px] font-semibold text-brand-ink shadow-[var(--shadow-sm)] transition-all hover:bg-brand-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sign in
              <svg
                className="transition-transform group-hover:translate-x-0.5"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </form>

      <p className="pt-2 text-center text-[13px] text-ink-soft">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
