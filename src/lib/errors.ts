// ─── Centralized Error Handling (Prompt 11) ───────────────────────────

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(field: string, issue: string) {
    super("validation_error", `${field}: ${issue}`, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("not_found", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("conflict", message, 409);
    this.name = "ConflictError";
  }
}

export class PermissionError extends AppError {
  constructor(message = "You don't have permission for this action.") {
    super("permission_denied", message, 403);
    this.name = "PermissionError";
  }
}

export class RateLimitError extends AppError {
  public retryAfter: number;
  constructor(retryAfter: number) {
    super(
      "rate_limit_exceeded",
      `Too many requests. Please wait ${retryAfter} seconds.`,
      429,
    );
    this.retryAfter = retryAfter;
    this.name = "RateLimitError";
  }
}

// ─── Database Error Mapping ───────────────────────────────────────────

export function mapDbError(error: { code?: string; message?: string }): AppError {
  const code = error.code ?? "";

  // Connection / timeout errors (retryable)
  if (code === "57P01" || code === "57P02" || code === "57P03" || code === "08006" || code === "08001" || code === "08003") {
    return new AppError(
      "connection_error",
      "Data save slow, please wait...",
      503,
      true,
    );
  }

  // Unique violation
  if (code === "23505") {
    const msg = error.message ?? "";
    if (msg.includes("do_number")) {
      return new ConflictError("DO number already exists. Use a different number.");
    }
    if (msg.includes("email")) {
      return new ConflictError("Email already registered.");
    }
    if (msg.includes("items") || msg.includes("name")) {
      return new ConflictError("Name already exists in this warehouse.");
    }
    return new ConflictError("A record with this value already exists.");
  }

  // Foreign key violation
  if (code === "23503") {
    if (error.message?.includes("do_items")) {
      return new ConflictError("Cannot delete item — it is in use by delivery orders.");
    }
    return new NotFoundError("Referenced record");
  }

  // Check constraint violation
  if (code === "23514") {
    return new ValidationError("field", "Invalid value");
  }

  // RLS policy violation
  if (code === "42501" || error.message?.includes("row-level security")) {
    return new PermissionError();
  }

  return new AppError("database_error", error.message ?? "Database error", 500);
}

// ─── Retry Logic ──────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (e instanceof AppError && e.retryable && i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

// ─── API Response Helpers ─────────────────────────────────────────────

export function jsonError(message: string, status: number, code?: string) {
  return Response.json(
    { error: code ?? "error", message },
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    const body: Record<string, unknown> = {
      error: error.code,
      message: error.message,
    };
    if (error instanceof RateLimitError) {
      body.retryAfter = error.retryAfter;
    }
    return Response.json(body, { status: error.statusCode });
  }

  console.error("Unhandled API error:", error);
  return Response.json(
    { error: "internal_error", message: "Something went wrong." },
    { status: 500 },
  );
}
