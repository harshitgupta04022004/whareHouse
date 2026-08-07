"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listItems, createItem, deleteItem } from "@/lib/api-client";

interface Item {
  item_id: string;
  name: string;
  bag_size: number;
}

export default function ItemsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");
  const [newItemBagSize, setNewItemBagSize] = useState(50);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchItems();
  }, [user]);

  async function fetchItems() {
    setLoading(true);
    try {
      const result = await listItems({ limit: 100 });
      setItems(result.data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = async () => {
    const name = newItemName.trim();
    if (!name) return;
    try {
      await createItem({ name, bag_size: newItemBagSize });
      setNewItemName("");
      setNewItemBagSize(50);
      setShowAdd(false);
      fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((i) => i.item_id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-[12px] text-ink-faint mb-6">
        <span className="hover:text-ink-soft cursor-pointer transition-colors" onClick={() => router.push("/challans")}>
          DOs
        </span>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">Item list</span>
      </div>

      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink mb-1">
        Item List
      </h1>
      <p className="text-[14px] text-ink-soft mb-2">
        Add or remove the items that appear in the DO drop-down — Wheat, Sugar, fruits, or anything new.
      </p>
      <p className="text-[12px] text-ink-faint mb-8">
        These are the items you can pick when creating a DO. Need a new one? Ask an admin to add it.
      </p>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Item list ({items.length})
          </span>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add item
          </button>
        </div>

        {showAdd && (
          <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.02] border-b border-border">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
              className="focus-ring flex-1 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors"
              placeholder="Item name"
            />
            <input
              type="number"
              value={newItemBagSize}
              onChange={(e) => setNewItemBagSize(Number(e.target.value))}
              min={1}
              className="focus-ring w-20 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink text-center transition-colors"
              placeholder="Bag size"
            />
            <button
              onClick={handleAdd}
              className="h-9 px-3 bg-brand hover:bg-brand-strong text-brand-ink text-[12px] font-semibold rounded-[9px] shadow-[var(--shadow-sm)] transition-all"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewItemName(""); }}
              className="h-9 px-3 text-[12px] font-medium text-ink-faint hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            Loading items...
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                No items yet. Add your first item above.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] text-ink font-medium">{item.name}</span>
                    <span className="text-[10px] font-semibold text-ink-faint bg-white/5 px-1.5 py-0.5 rounded-md">
                      {item.bag_size} kg/bag
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.item_id)}
                    className="p-1 text-ink-faint hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove item"
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
