import { requireAuth, getClientIp, getUserAgent } from "@/lib/auth";
import { assertDoOwnership, checkRouteAccess } from "@/lib/rbac";
import { AppError, handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
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

    if (!(await isDriveConfigured(user.warehouseId))) {
      throw new AppError(
        "drive_not_configured",
        "Google Drive is not configured. Ask an admin to check the server environment variables.",
        503,
      );
    }

    const supabase = createServiceClient();
    let doNumber: string | undefined;
    if (doId) {
      const { data: doRow, error: doError } = await supabase
        .from("delivery_orders")
        .select("do_id, do_number, user_id")
        .eq("do_id", doId)
        .eq("warehouse_id", user.warehouseId)
        .single();
      if (doError || !doRow) throw new NotFoundError("Delivery order");
      assertDoOwnership(doRow.user_id, user);
      doNumber = doRow.do_number;
    }

    const folderPath = getFolderPath(category, user.name, doNumber);
    const uploaded = await uploadToDrive(
      file,
      folderPath,
      file.name,
      user.warehouseId,
    );

    const { data, error } = await supabase
      .from("files")
      .insert({
        warehouse_id: user.warehouseId,
        user_id: user.userId,
        do_id: doId ?? null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        drive_file_id: uploaded.fileId,
        drive_url: uploaded.url,
        folder_path: folderPath,
        category,
        description: description ?? null,
      })
      .select("file_id")
      .single();

    if (error) {
      try {
        await deleteFromDrive(uploaded.fileId, user.warehouseId);
      } catch (cleanupError) {
        console.error("Drive cleanup after database failure failed:", cleanupError);
      }
      throw error;
    }

    await writeAudit(supabase, {
      warehouseId: user.warehouseId, userId: user.userId,
      entity: "file", entityId: data.file_id, action: "upload_file",
      newData: { file_name: file.name, file_type: file.type, file_size: file.size, category, do_id: doId },
      ipAddress: getClientIp(request), userAgent: getUserAgent(request),
    });

    return Response.json(
      {
        file_id: data.file_id,
        drive_url: uploaded.url,
        folder_path: folderPath,
        storage: "google_drive",
        message: "File uploaded to Google Drive.",
      },
      { status: 201 },
    );
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

    if (user.role === "staff") query = query.eq("user_id", user.userId);
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
    const { data: existing } = await supabase
      .from("files")
      .select("*")
      .eq("file_id", fileId)
      .eq("warehouse_id", user.warehouseId)
      .single();
    if (!existing) throw new ValidationError("id", "File not found");

    try {
      await deleteFromDrive(existing.drive_file_id, user.warehouseId);
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
