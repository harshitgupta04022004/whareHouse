import { google } from "googleapis";
import { Readable } from "stream";

let driveClient: ReturnType<typeof google.drive> | null = null;

function getDriveClient() {
  if (driveClient) return driveClient;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size === 0) return { valid: false, error: "Empty file not allowed" };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: "File too large (max 100 MB)" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { valid: false, error: `File type not allowed: ${file.type}` };
  return { valid: true };
}

export function getFolderPath(category: string, userName: string, doNumber?: string): string {
  switch (category) {
    case "document": return `Documents/${userName}/${doNumber ?? "general"}/`;
    case "report": return "Reports/";
    case "do_pdf": return "DOs/";
    case "template": return "Shared/Templates/";
    case "rate_list": return "Shared/Rate Lists/";
    case "contact": return "Shared/Contacts/";
    case "backup": return "Backups/";
    default: return `Documents/${userName}/`;
  }
}

async function ensureFolder(drive: ReturnType<typeof google.drive>, parentId: string, name: string): Promise<string> {
  const { data: existing } = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)", spaces: "drive",
  });
  if (existing.files?.[0]?.id) return existing.files[0].id;
  const { data: created } = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  if (!created.id) throw new Error("Failed to create folder");
  return created.id;
}

export async function uploadToDrive(file: File, folderPath: string, fileName: string): Promise<{ fileId: string; url: string }> {
  const drive = getDriveClient();
  if (!drive) throw new Error("Google Drive not configured");
  const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) throw new Error("DRIVE_ROOT_FOLDER_ID not configured");

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

export async function deleteFromDrive(driveFileId: string): Promise<void> {
  const drive = getDriveClient();
  if (!drive) return;
  await drive.files.delete({ fileId: driveFileId });
}

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.DRIVE_ROOT_FOLDER_ID);
}
