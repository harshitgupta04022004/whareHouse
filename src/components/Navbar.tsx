"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/challans" className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand text-brand-ink shadow-[var(--shadow-sm)]">
                <svg
                  width="17"
                  height="17"
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
                <span className="font-display font-bold text-[14px] tracking-[-0.01em] text-ink block">
                  {user?.warehouseName ?? "Warehouse"}
                </span>
                <span className="text-[10px] font-medium text-ink-faint">
                  DO Records &middot; Goods &amp; Warehouse
                </span>
              </div>
            </Link>
            <nav className="hidden sm:flex items-center gap-0.5">
              <Link
                href="/challans"
                className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
                  isActive("/challans")
                    ? "bg-white/10 text-ink"
                    : "text-ink-soft hover:text-ink hover:bg-white/5"
                }`}
              >
                DOs
              </Link>
              <Link
                href="/items"
                className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
                  isActive("/items")
                    ? "bg-white/10 text-ink"
                    : "text-ink-soft hover:text-ink hover:bg-white/5"
                }`}
              >
                Items
              </Link>
              <Link
                href="/parties"
                className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
                  isActive("/parties")
                    ? "bg-white/10 text-ink"
                    : "text-ink-soft hover:text-ink hover:bg-white/5"
                }`}
              >
                Parties
              </Link>
              {(user?.role === "admin" || user?.role === "manager") && (
                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "bg-white/10 text-ink"
                      : "text-ink-soft hover:text-ink hover:bg-white/5"
                  }`}
                >
                  Dashboard
                </Link>
              )}
              {user?.role === "admin" && (
                <>
                  <Link
                    href="/users"
                    className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
                      isActive("/users")
                        ? "bg-white/10 text-ink"
                        : "text-ink-soft hover:text-ink hover:bg-white/5"
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/audit"
                    className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
                      isActive("/audit")
                        ? "bg-white/10 text-ink"
                        : "text-ink-soft hover:text-ink hover:bg-white/5"
                    }`}
                  >
                    Audit
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-brand/80 flex items-center justify-center text-[10px] font-semibold text-brand-ink">
                    {user.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold text-ink leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-ink-faint truncate max-w-[140px]">
                      {user.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-ink-faint hover:text-ink transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex items-center gap-0.5 pb-2">
          <Link
            href="/challans"
            className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
              isActive("/challans")
                ? "bg-white/10 text-ink"
                : "text-ink-soft hover:text-ink hover:bg-white/5"
            }`}
          >
            DOs
          </Link>
          <Link
            href="/items"
            className={`px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors ${
              isActive("/items")
                ? "bg-white/10 text-ink"
                : "text-ink-soft hover:text-ink hover:bg-white/5"
            }`}
          >
            Item list
          </Link>
        </div>
      </div>
    </header>
  );
}
