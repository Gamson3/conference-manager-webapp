import type { RequestHandler } from "express";
import prisma from "../lib/prisma";

type DateField =
  | "startDate"
  | "endDate"
  | "submissionsOpenFrom"
  | "submissionsOpenUntil"
  | "reviewStartsAt"
  | "reviewEndsAt"
  | "registrationOpenFrom"
  | "registrationOpenUntil";

type DatePair = {
  start: DateField;
  end: DateField;
  startLabel: string;
  endLabel: string;
  kind: "date-only" | "date-time";
};

const datePairs: DatePair[] = [
  {
    start: "startDate",
    end: "endDate",
    startLabel: "Start date",
    endLabel: "End date",
    kind: "date-only",
  },
  {
    start: "submissionsOpenFrom",
    end: "submissionsOpenUntil",
    startLabel: "CFP open date",
    endLabel: "CFP close date",
    kind: "date-time",
  },
  {
    start: "reviewStartsAt",
    end: "reviewEndsAt",
    startLabel: "Review start date",
    endLabel: "Review end date",
    kind: "date-time",
  },
  {
    start: "registrationOpenFrom",
    end: "registrationOpenUntil",
    startLabel: "Registration open date",
    endLabel: "Registration close date",
    kind: "date-time",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function dateOnlyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isPastDateOnlyUTC(d: Date, todayDateOnlyUTC: string): boolean {
  return dateOnlyUTC(d) < todayDateOnlyUTC;
}

function isPastInstant(d: Date, now: Date): boolean {
  return d.getTime() < now.getTime();
}

type ParsedBodyDate =
  | { kind: "missing" }
  | { kind: "null" }
  | { kind: "date"; date: Date; dateOnly: string }
  | { kind: "invalid" };

function parseBodyDate(body: Record<string, unknown>, key: DateField): ParsedBodyDate {
  if (!hasOwn(body, key)) return { kind: "missing" };

  const raw = body[key];
  if (raw === null) return { kind: "null" };

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return { kind: "invalid" };
    return { kind: "date", date: raw, dateOnly: dateOnlyUTC(raw) };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return { kind: "invalid" };
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return { kind: "invalid" };
    return { kind: "date", date: parsed, dateOnly: dateOnlyUTC(parsed) };
  }

  return { kind: "invalid" };
}

function existingDateOnly(existing: Date | null): string | null {
  return existing ? dateOnlyUTC(existing) : null;
}

function badRequest(res: Parameters<RequestHandler>[1], message: string): void {
  res.status(400).json({ message });
}

export const validateConferenceDatesForCreate: RequestHandler = (req, res, next) => {
  if (!isRecord(req.body)) {
    badRequest(res, "Invalid request body.");
    return;
  }

  const body = req.body;
  const now = new Date();
  const today = dateOnlyUTC(now);

  // On create, start/end are required and cannot be in the past.
  const startParsed = parseBodyDate(body, "startDate");
  const endParsed = parseBodyDate(body, "endDate");

  if (startParsed.kind !== "date") {
    badRequest(res, "Start date is required and must be a valid date.");
    return;
  }

  if (endParsed.kind !== "date") {
    badRequest(res, "End date is required and must be a valid date.");
    return;
  }

  if (startParsed.dateOnly < today || endParsed.dateOnly < today) {
    badRequest(res, "Conference dates can’t be in the past.");
    return;
  }

  if (endParsed.dateOnly < startParsed.dateOnly) {
    badRequest(res, "End date can’t be before start date.");
    return;
  }

  // Optional windows (if provided) must not be in the past and must have end >= start.
  for (const pair of datePairs) {
    if (pair.start === "startDate") continue;

    const start = parseBodyDate(body, pair.start);
    const end = parseBodyDate(body, pair.end);

    if (start.kind === "invalid" || end.kind === "invalid") {
      badRequest(res, "One or more dates are invalid.");
      return;
    }

    if (start.kind === "date") {
      const isPast = pair.kind === "date-only" ? isPastDateOnlyUTC(start.date, today) : isPastInstant(start.date, now);
      if (isPast) {
        badRequest(res, `${pair.startLabel} can’t be in the past.`);
        return;
      }
    }

    if (end.kind === "date") {
      const isPast = pair.kind === "date-only" ? isPastDateOnlyUTC(end.date, today) : isPastInstant(end.date, now);
      if (isPast) {
        badRequest(res, `${pair.endLabel} can’t be in the past.`);
        return;
      }
    }

    if (start.kind === "date" && end.kind === "date") {
      const ok = pair.kind === "date-only"
        ? end.dateOnly >= start.dateOnly
        : end.date.getTime() >= start.date.getTime();
      if (!ok) {
        badRequest(res, `${pair.endLabel} can’t be before ${pair.startLabel.toLowerCase()}.`);
        return;
      }
    }
  }

  next();
};

export const validateConferenceDatesForUpdate: RequestHandler = async (req, res, next) => {
  if (!isRecord(req.body)) {
    badRequest(res, "Invalid request body.");
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    badRequest(res, "Invalid conference id.");
    return;
  }

  const existing = await prisma.conference.findUnique({
    where: { id },
    select: {
      startDate: true,
      endDate: true,
      submissionsOpenFrom: true,
      submissionsOpenUntil: true,
      reviewStartsAt: true,
      reviewEndsAt: true,
      registrationOpenFrom: true,
      registrationOpenUntil: true,
    },
  });

  if (!existing) {
    res.status(404).json({ message: "Conference not found" });
    return;
  }

  const body = req.body;
  const now = new Date();
  const today = dateOnlyUTC(now);

  // Prevent setting required conference dates to null.
  for (const requiredKey of ["startDate", "endDate"] as const) {
    const parsed = parseBodyDate(body, requiredKey);
    if (parsed.kind === "null") {
      badRequest(res, `${requiredKey} can’t be cleared.`);
      return;
    }
    if (parsed.kind === "invalid") {
      badRequest(res, `${requiredKey} must be a valid date.`);
      return;
    }
  }

  // No-new-past validation for any provided date field.
  const allKeys: DateField[] = [
    "startDate",
    "endDate",
    "submissionsOpenFrom",
    "submissionsOpenUntil",
    "reviewStartsAt",
    "reviewEndsAt",
    "registrationOpenFrom",
    "registrationOpenUntil",
  ];

  for (const key of allKeys) {
    const parsed = parseBodyDate(body, key);
    if (parsed.kind === "missing") continue;

    if (parsed.kind === "invalid") {
      badRequest(res, `${key} must be a valid date.`);
      return;
    }

    if (parsed.kind === "date") {
      const pair = datePairs.find((p) => p.start === key || p.end === key);
      const kind = pair?.kind ?? "date-time";

      const existingOnly = existingDateOnly(existing[key]);
      const sameAsExisting = existingOnly !== null && parsed.dateOnly === existingOnly;

      const isPast = kind === "date-only" ? isPastDateOnlyUTC(parsed.date, today) : isPastInstant(parsed.date, now);
      if (isPast && !sameAsExisting) {
        const label =
          datePairs.find((p) => p.start === key)?.startLabel ??
          datePairs.find((p) => p.end === key)?.endLabel ??
          key;
        badRequest(res, `${label} can’t be in the past.`);
        return;
      }
    }
  }

  // Range validation using final values (existing + any provided updates).
  for (const pair of datePairs) {
    const startParsed = parseBodyDate(body, pair.start);
    const endParsed = parseBodyDate(body, pair.end);

    if (startParsed.kind === "invalid" || endParsed.kind === "invalid") {
      badRequest(res, "One or more dates are invalid.");
      return;
    }

    const finalStart =
      startParsed.kind === "missing"
        ? existing[pair.start]
        : startParsed.kind === "null"
          ? null
          : startParsed.date;

    const finalEnd =
      endParsed.kind === "missing"
        ? existing[pair.end]
        : endParsed.kind === "null"
          ? null
          : endParsed.date;

    if (finalStart && finalEnd) {
      const ok = pair.kind === "date-only"
        ? dateOnlyUTC(finalEnd) >= dateOnlyUTC(finalStart)
        : finalEnd.getTime() >= finalStart.getTime();
      if (!ok) {
        badRequest(res, `${pair.endLabel} can’t be before ${pair.startLabel.toLowerCase()}.`);
        return;
      }
    }
  }

  next();
};
