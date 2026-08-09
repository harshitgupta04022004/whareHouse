"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  deleteFile,
  listFiles,
  uploadFile,
  type StoredFile,
} from "@/lib/api-client";

const DOCUMENT_CATEGORIES = [
  { value: "document", label: "General document / सामान्य दस्तावेज़" },
  { value: "report", label: "Report / रिपोर्ट" },
  { value: "template", label: "Template / टेम्पलेट" },
  { value: "rate_list", label: "Rate list / रेट लिस्ट" },
  { value: "contact", label: "Contact / संपर्क" },
  { value: "other", label: "Other / अन्य" },
] as const;

function categoryLabel(category: string) {
  return (
    DOCUMENT_CATEGORIES.find((option) => option.value === category)?.label ??
    category
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("document");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState("");

  const refreshFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFiles();
      setFiles(result.files);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listFiles()
      .then((result) => {
        if (!cancelled) setFiles(result.files);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Could not load documents",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", category);
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      await uploadFile(formData);
      setSelectedFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage("Uploaded to Google Drive / Google Drive पर अपलोड हो गया।");
      await refreshFiles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: StoredFile) => {
    if (!confirm(`Delete ${file.file_name}? / फ़ाइल हटाएं?`)) return;
    try {
      await deleteFile(file.file_id);
      setFiles((current) =>
        current.filter((item) => item.file_id !== file.file_id),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const canDelete = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 text-[12px] text-ink-faint">
        <Link href="/challans" className="transition-colors hover:text-ink-soft">
          DOs
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">Documents</span>
      </div>

      <div className="mb-6">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
          Documents{" "}
          <span className="text-[16px] font-normal text-ink-soft sm:text-[18px]">
            / दस्तावेज़
          </span>
        </h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Upload warehouse files that are not linked to a delivery order.
        </p>
        <p className="mt-1 text-[12px] text-ink-faint">
          ऐसे गोदाम दस्तावेज़ अपलोड करें जो किसी DO से जुड़े नहीं हैं।
        </p>
      </div>

      <div className="mb-5 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">
              Category / श्रेणी
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="focus-ring h-10 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[13px] text-ink"
            >
              {DOCUMENT_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">
              Description / विवरण
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={250}
              placeholder="Optional description"
              className="focus-ring h-10 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint"
            />
          </label>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            chooseFile(event.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 cursor-pointer rounded-[12px] border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/40 hover:bg-white/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.csv,.xls,.xlsx,.doc,.docx,.txt"
            onChange={(event) => chooseFile(event.target.files?.[0])}
            className="hidden"
          />
          <svg
            className="mx-auto mb-2 h-8 w-8 text-ink-faint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
            <path d="M5 13v6h14v-6" />
          </svg>
          {selectedFile ? (
            <>
              <p className="text-[13px] font-semibold text-ink">
                {selectedFile.name}
              </p>
              <p className="mt-1 text-[11px] text-ink-faint">
                {formatFileSize(selectedFile.size)} · Click to choose another file
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-ink-soft">
                Drag a file here or{" "}
                <span className="font-semibold text-brand">browse</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-faint">
                PDF, image, CSV, Excel, Word or TXT · max 4 MB
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-ink-faint">
            Stored securely in the connected Google Drive folder.
          </p>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="h-10 rounded-[10px] bg-brand px-5 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload document / अपलोड करें"}
          </button>
        </div>

        {message && (
          <p className="mt-3 rounded-[9px] border border-border bg-surface-2 px-3 py-2 text-[12px] text-ink-soft">
            {message}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            All documents / सभी दस्तावेज़ ({files.length})
          </span>
          <span className="text-[10px] font-medium text-brand">
            Google Drive
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-[13px] text-ink-faint">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            Loading documents...
          </div>
        ) : files.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-ink-faint">
            No custom documents uploaded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">
                    {file.file_name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-ink-faint">
                    <span>{categoryLabel(file.category)}</span>
                    <span>·</span>
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>·</span>
                    <span>{formatDate(file.created_at)}</span>
                    {file.do_id && (
                      <>
                        <span>·</span>
                        <Link
                          href={`/challans/${file.do_id}`}
                          className="font-medium text-brand hover:underline"
                        >
                          Linked DO
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-ink-faint">
                    Warehouse/{file.folder_path}
                  </div>
                  {file.description && (
                    <p className="mt-1 text-[12px] text-ink-soft">
                      {file.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={file.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded-[8px] border border-border px-3 text-[12px] font-semibold text-brand transition-colors hover:bg-brand/5"
                  >
                    Open / खोलें
                  </a>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      className="inline-flex h-8 items-center rounded-[8px] border border-red-500/30 px-3 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      Delete / हटाएं
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

