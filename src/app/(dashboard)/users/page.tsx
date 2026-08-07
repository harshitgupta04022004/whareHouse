"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listUsers, inviteUser, updateUserRole, removeUser } from "@/lib/api-client";

interface AppUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/challans");
      return;
    }
    fetchUsers();
  }, [user, router]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const result = await listUsers();
      setUsers(result.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setError("");
    try {
      await inviteUser({ email: inviteEmail, name: inviteName, role: inviteRole });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("staff");
      setShowInvite(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this user? They will lose access immediately.")) return;
    try {
      await removeUser(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove user");
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-500/15 text-purple-400",
    manager: "bg-blue-500/15 text-blue-400",
    staff: "bg-green-500/15 text-green-400",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-[12px] text-ink-faint mb-6">
        <span className="hover:text-ink-soft cursor-pointer transition-colors" onClick={() => router.push("/challans")}>
          DOs
        </span>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">Users</span>
      </div>

      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink mb-1">
        User Management
      </h1>
      <p className="text-[14px] text-ink-soft mb-2">
        Invite team members and manage roles.
      </p>
      <p className="text-[12px] text-ink-faint mb-8">
        Roles control what each user can do: staff can create DOs, managers can edit, admins manage users.
      </p>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Users ({users.length})
          </span>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Invite user
          </button>
        </div>

        {showInvite && (
          <div className="px-5 py-3 bg-white/[0.02] border-b border-border space-y-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] px-3 py-1.5 rounded-lg">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="focus-ring flex-1 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors"
                placeholder="Name"
              />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="focus-ring flex-1 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors"
                placeholder="Email"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="focus-ring h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink transition-colors"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleInvite}
                className="h-9 px-3 bg-brand hover:bg-brand-strong text-brand-ink text-[12px] font-semibold rounded-[9px] shadow-[var(--shadow-sm)] transition-all"
              >
                Invite
              </button>
              <button
                onClick={() => { setShowInvite(false); setError(""); }}
                className="h-9 px-3 text-[12px] font-medium text-ink-faint hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            Loading users...
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {users.map((u) => (
              <div
                key={u.user_id}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-[11px] font-semibold text-brand-ink">
                    {u.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-ink">{u.name}</div>
                    <div className="text-[11px] text-ink-faint">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                    className={`h-7 rounded-lg border border-border bg-transparent px-2 text-[11px] font-semibold transition-colors appearance-none cursor-pointer ${roleColors[u.role] || ""}`}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  {u.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemove(u.user_id)}
                      className="p-1 text-ink-faint hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove user"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
