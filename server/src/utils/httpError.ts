import type { Response } from "express";

export type ApiErrorCode =
  | "INVALID_ARGUMENT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

export function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string
): void {
  const body: ApiErrorBody = { code, message };
  res.status(status).json(body);
}

export function parseNumericId(
  raw: string,
  label: string
): { ok: true; value: number } | { ok: false; message: string } {
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return { ok: false, message: `${label} must be a positive integer` };
  }
  return { ok: true, value };
}
