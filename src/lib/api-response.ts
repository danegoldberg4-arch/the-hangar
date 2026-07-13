import { NextResponse, type NextRequest } from "next/server";

export type FieldErrors = Record<string, string>;

export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors
) {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(fieldErrors && Object.keys(fieldErrors).length > 0
        ? { fieldErrors }
        : {}),
    },
    { status }
  );
}

export function validationError(fieldErrors: FieldErrors) {
  const firstMessage = Object.values(fieldErrors)[0];
  return apiError(
    400,
    "VALIDATION_ERROR",
    firstMessage || "The request contains invalid fields.",
    fieldErrors
  );
}

export async function readJsonObject(
  request: NextRequest
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        ok: false,
        response: apiError(
          400,
          "INVALID_JSON",
          "The request body must be a JSON object."
        ),
      };
    }

    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: apiError(400, "INVALID_JSON", "The request body is not valid JSON."),
    };
  }
}

export function internalError(context: string, error: unknown) {
  console.error(`[api] ${context}`, error);
  return apiError(
    500,
    "INTERNAL_ERROR",
    "The request could not be completed. Please try again."
  );
}
