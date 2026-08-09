import { google } from "googleapis";
import { Readable } from "stream";
import { decryptRefreshToken, getDriveIntegration } from "./drive-oauth";

async function getDriveClient(warehouseId: string) {
  const integration = await getDriveIntegration(warehouseId);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!integration || !clientId || !clientSecret) return null;

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({
    refresh_token: decryptRefreshToken(integration.refresh_token_encrypted),
  });
  return {
    drive: google.drive({ version: "v3", auth }),
    rootFolderId: integration.root_folder_id,
  };
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// Keep uploads below Vercel's request body limit. Larger files should use a
// resumable/direct upload flow instead of passing through the API route.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size === 0) return { valid: false, error: "Empty file not allowed" };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: "File too large (max 4 MB)" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { valid: false, error: `File type not allowed: ${file.type}` };
  return { valid: true };
}

export function getFolderPath(category: string, userName: string, doNumber?: string): string {
  const safeUserName = sanitizeFolderName(userName);
  const safeDoNumber = doNumber ? sanitizeFolderName(doNumber) : undefined;
  switch (category) {
    case "document": return `Documents/${safeUserName}/${safeDoNumber ?? "general"}/`;
    case "report": return "Reports/";
    case "do_pdf": return "DOs/";
    case "template": return "Shared/Templates/";
    case "rate_list": return "Shared/Rate Lists/";
    case "contact": return "Shared/Contacts/";
    case "backup": return "Backups/";
    default: return `Documents/${safeUserName}/`;
  }
}

function sanitizeFolderName(value: string): string {
  return value
    .replace(/[\\/]/g, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 120) || "unknown";
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function ensureFolder(drive: ReturnType<typeof google.drive>, parentId: string, name: string): Promise<string> {
  const escapedName = escapeDriveQueryValue(name);
  const { data: existing } = await drive.files.list({
    q: `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)", spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (existing.files?.[0]?.id) return existing.files[0].id;
  const { data: created } = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.id) throw new Error("Failed to create folder");
  return created.id;
}

export async function uploadToDrive(
  file: File,
  folderPath: string,
  fileName: string,
  warehouseId: string,
): Promise<{ fileId: string; url: string }> {
  const client = await getDriveClient(warehouseId);
  if (!client) throw new Error("Google Drive is not connected for this warehouse");
  const { drive, rootFolderId } = client;

  const pathParts = folderPath.split("/").filter(Boolean);
  let parentId = rootFolderId;
  for (const part of pathParts) {
    parentId = await ensureFolder(drive, parentId, part);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { data: uploaded } = await drive.files.create({
    requestBody: { name: fileName, parents: [parentId] },
    media: { mimeType: file.type, body: Readable.from(buffer) as unknown as NodeJS.ReadableStream },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  if (!uploaded.id) throw new Error("Failed to upload to Google Drive");
  return {
    fileId: uploaded.id,
    url: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

export function getDownloadUrl(driveFileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

export async function deleteFromDrive(driveFileId: string, warehouseId: string): Promise<void> {
  const client = await getDriveClient(warehouseId);
  if (!client) throw new Error("Google Drive is not connected for this warehouse");
  const { drive } = client;
  await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true });
}

export async function isDriveConfigured(warehouseId: string): Promise<boolean> {
  return (await getDriveIntegration(warehouseId)) !== null;
}

export async function checkDriveConnection(warehouseId: string): Promise<{
  ok: boolean;
  folderName?: string;
  error?: string;
}> {
  const client = await getDriveClient(warehouseId);
  if (!client) {
    return { ok: false, error: "not_configured" };
  }
  const { drive, rootFolderId } = client;

  try {
    const { data } = await drive.files.get({
      fileId: rootFolderId,
      fields: "name,mimeType,capabilities(canAddChildren)",
      supportsAllDrives: true,
    });
    const isFolder = data.mimeType === "application/vnd.google-apps.folder";
    const canAddChildren = data.capabilities?.canAddChildren === true;
    if (!isFolder || !canAddChildren) {
      return { ok: false, error: "folder_not_writable" };
    }
    return { ok: true, folderName: data.name ?? "Google Drive" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "connection_failed",
    };
  }
}
