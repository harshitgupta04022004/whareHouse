"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listParties, createParty, deleteParty } from "@/lib/api-client";

interface Party {
  party_id: string;
  name: string;
  created_at: string;
}

export default function PartiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchParties();
  }, [user]);

  async function fetchParties() {
    setLoading(true);
    try {
      const result = await listParties({ limit: 100 });
      setParties(result.data);
    } catch (err) {
      console.error("Failed to fetch parties:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createParty({ name });
      setNewName("");
      setShowAdd(false);
      fetchParties();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add party");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this party?")) return;
    try {
      await deleteParty(id);
      setParties((prev) => prev.filter((p) => p.party_id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete party");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-[12px] text-ink-faint mb-6">
        <span className="hover:text-ink-soft cursor-pointer transition-colors" onClick={() => router.push("/challans")}>
          DOs
        </span>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">Parties</span>
      </div>

      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink mb-1">
        Parties
      </h1>
      <p className="text-[14px] text-ink-soft mb-2">
        Manage trading parties — buyers, suppliers and transporters.
      </p>
      <p className="text-[12px] text-ink-faint mb-8">
        These appear in the DO form when selecting a party.
      </p>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Parties ({parties.length})
          </span>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add party
          </button>
        </div>

        {showAdd && (
          <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.02] border-b border-border">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
              className="focus-ring flex-1 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors"
              placeholder="Party name"
            />
            <button
              onClick={handleAdd}
              className="h-9 px-3 bg-brand hover:bg-brand-strong text-brand-ink text-[12px] font-semibold rounded-[9px] shadow-[var(--shadow-sm)] transition-all"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="h-9 px-3 text-[12px] font-medium text-ink-faint hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            Loading parties...
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {parties.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                No parties yet. Add your first party above.
              </div>
            ) : (
              parties.map((party) => (
                <div
                  key={party.party_id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors group"
                >
                  <span className="text-[14px] text-ink font-medium">{party.name}</span>
                  <button
                    onClick={() => handleDelete(party.party_id)}
                    className="p-1 text-ink-faint hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove party"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
