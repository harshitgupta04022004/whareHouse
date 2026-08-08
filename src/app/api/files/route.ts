import { requireAuth, getClientIp, getUserAgent } from "@/lib/auth";
import { checkRouteAccess } from "@/lib/rbac";
import { handleApiError, ValidationError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase";
import { writeAudit } from "@/lib/audit";
import { validateFile, getFolderPath, uploadToDrive, deleteFromDrive, isDriveConfigured } from "@/lib/drive";

const ROUTE_KEY_GET = "GET /api/files";
const ROUTE_KEY_POST = "POST /api/files/upload";
const ROUTE_KEY_DELETE = "DELETE /api/files";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_POST, user);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const doId = formData.get("do_id") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) throw new ValidationError("file", "File is required");
    if (!category) throw new ValidationError("category", "Category is required");

    const validCategories = ["document", "report", "do_pdf", "template", "rate_list", "contact", "backup", "other"];
    if (!validCategories.includes(category)) throw new ValidationError("category", "Invalid category");

    const validation = validateFile(file);
    if (!validation.valid) throw new ValidationError("file", validation.error!);

    if (doId) {
      const supabaseCheck = createServiceClient();
      const { data: doRow } = await supabaseCheck.from("delivery_orders").select("do_id").eq("do_id", doId).single();
      if (!doRow) throw new ValidationError("do_id", "Delivery order not found");
    }

    const folderPath = getFolderPath(category, user.name, doId ?? undefined);

    let driveFileId: string;
    let driveUrl: string;

    if (isDriveConfigured()) {
      const result = await uploadToDrive(file, folderPath, file.name);
      driveFileId = result.fileId;
      driveUrl = result.url;
    } else {
      driveFileId = `dev_${Date.now()}`;
      driveUrl = "#dev-placeholder";
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("files")
      .insert({
        warehouse_id: user.warehouseId,
        user_id: user.userId,
        do_id: doId ?? null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        drive_file_id: driveFileId,
        drive_url: driveUrl,
        folder_path: folderPath,
        category,
        description: description ?? null,
      })
      .select("file_id")
      .single();

    if (error) throw error;

    await writeAudit(supabase, {
      warehouseId: user.warehouseId, userId: user.userId,
      entity: "file", entityId: data.file_id, action: "upload_file",
      newData: { file_name: file.name, file_type: file.type, file_size: file.size, category, do_id: doId },
      ipAddress: getClientIp(request), userAgent: getUserAgent(request),
    });

    return Response.json({ file_id: data.file_id, drive_url: driveUrl, message: "File uploaded." }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_GET, user);

    const url = new URL(request.url);
    const doId = url.searchParams.get("do_id");
    const category = url.searchParams.get("category");

    const supabase = createServiceClient();
    let query = supabase.from("files").select("*").eq("warehouse_id", user.warehouseId).order("created_at", { ascending: false });

    if (doId) query = query.eq("do_id", doId);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ files: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(request);
    await checkRouteAccess(ROUTE_KEY_DELETE, user);

    const url = new URL(request.url);
    const fileId = url.searchParams.get("id");
    if (!fileId) throw new ValidationError("id", "File ID required");

    const supabase = createServiceClient();
    const { data: existing } = await supabase.from("files").select("*").eq("file_id", fileId).single();
    if (!existing) throw new ValidationError("id", "File not found");

    try {
      await deleteFromDrive(existing.drive_file_id);
    } catch (driveError) {
      console.error("Drive delete failed (DB delete proceeds):", driveError);
    }

    const { error } = await supabase.from("files").delete().eq("file_id", fileId);
    if (error) throw error;

    await writeAudit(supabase, {
      warehouseId: user.warehouseId, userId: user.userId,
      entity: "file", entityId: fileId, action: "delete",
      oldData: existing as unknown as Record<string, unknown>,
    });

    return Response.json({ message: "File deleted." });
  } catch (error) {
    return handleApiError(error);
  }
}
