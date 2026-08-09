"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listItems, createItem, updateItem, deleteItem } from "@/lib/api-client";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBagSize, setEditBagSize] = useState(50);

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

  const trimmedName = newItemName.trim();
  const isDuplicate = trimmedName.length > 0 && items.some(
    (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
  );

  const handleAdd = async () => {
    const name = newItemName.trim();
    if (!name || isDuplicate) return;
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

  const handleEdit = (item: Item) => {
    setEditingId(item.item_id);
    setEditName(item.name);
    setEditBagSize(item.bag_size);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditBagSize(50);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    
    const isEditDuplicate = items.some(
      (item) => item.item_id !== editingId && item.name.toLowerCase() === editName.trim().toLowerCase()
    );
    
    if (isEditDuplicate) {
      alert("An item with this name already exists. / इस नाम का माल पहले से मौजूद है।");
      return;
    }

    try {
      await updateItem(editingId, { name: editName.trim(), bag_size: editBagSize });
      handleCancelEdit();
      fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item? / यह माल हटाएं?")) return;
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
        Item List <span className="text-[18px] text-ink-soft font-normal">/ माल सूची</span>
      </h1>
      <p className="text-[14px] text-ink-soft mb-2">
        Add or remove the items that appear in the DO drop-down — Wheat, Sugar, fruits, or anything new.
      </p>
      <p className="text-[13px] text-ink-faint mb-1">
        DO में दिखने वाले माल को जोड़ें या हटाएं — गेहूं, चीनी, फल, या कुछ भी नया।
      </p>
      <p className="text-[12px] text-ink-faint mb-8">
        These are the items you can pick when creating a DO. Need a new one? Ask an admin to add it.
      </p>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Item list / माल सूची ({items.length})
          </span>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add item / माल जोड़ें
          </button>
        </div>

        {showAdd && (
          <div className="px-5 py-3 bg-white/[0.02] border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isDuplicate && handleAdd()}
                autoFocus
                className={`focus-ring flex-1 h-9 rounded-[9px] border px-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors bg-surface-2 ${
                  isDuplicate ? "border-red-500/50" : "border-border"
                }`}
                placeholder="Item name / माल का नाम"
              />
              <input
                type="number"
                value={newItemBagSize}
                onChange={(e) => setNewItemBagSize(Number(e.target.value))}
                min={1}
                className="focus-ring w-20 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink text-center transition-colors"
                placeholder="Bag / बोरी"
              />
              <button
                onClick={handleAdd}
                disabled={isDuplicate || !trimmedName}
                className="h-9 px-3 bg-brand hover:bg-brand-strong text-brand-ink text-[12px] font-semibold rounded-[9px] shadow-[var(--shadow-sm)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add / जोड़ें
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewItemName(""); }}
                className="h-9 px-3 text-[12px] font-medium text-ink-faint hover:text-ink transition-colors"
              >
                Cancel / रद्द
              </button>
            </div>
            {isDuplicate && (
              <p className="text-[12px] text-red-400">
                An item with this name already exists. / इस नाम का माल पहले से मौजूद है।
              </p>
            )}
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            Loading items... / माल लोड हो रहा है...
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
                No items yet. Add your first item above. / अभी कोई माल नहीं। पहला माल ऊपर जोड़ें।
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.item_id}
                  className="px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {editingId === item.item_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                        autoFocus
                        className="focus-ring flex-1 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors"
                        placeholder="Item name / माल का नाम"
                      />
                      <input
                        type="number"
                        value={editBagSize}
                        onChange={(e) => setEditBagSize(Number(e.target.value))}
                        min={1}
                        className="focus-ring w-20 h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink text-center transition-colors"
                        placeholder="Bag / बोरी"
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editName.trim()}
                        className="h-9 px-3 bg-brand hover:bg-brand-strong text-brand-ink text-[12px] font-semibold rounded-[9px] shadow-[var(--shadow-sm)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Save / सेव
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="h-9 px-3 text-[12px] font-medium text-ink-faint hover:text-ink transition-colors"
                      >
                        Cancel / रद्द
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] text-ink font-medium">{item.name}</span>
                        <span className="text-[10px] font-semibold text-ink-faint bg-white/5 px-1.5 py-0.5 rounded-md">
                          {item.bag_size} kg/बोरी
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-ink-faint hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                          title="Edit item / माल संपादित करें"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.item_id)}
                          className="p-1 text-ink-faint hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove item / माल हटाएं"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}