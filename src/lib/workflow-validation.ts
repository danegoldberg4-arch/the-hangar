import {
  dateOnlyInTimeZone,
  parseDateOnly,
} from "./date-only";

export { dateOnlyInTimeZone, parseDateOnly } from "./date-only";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

export interface MaintenancePart {
  name: string;
  partNumber?: string;
}

export interface MaintenanceCreateInput {
  name: string;
  category: string;
  description: string;
  intervalDays: number;
  intervalLabel: string;
  parts: string;
  notes: string;
  assignedTo: string;
}

export interface MaintenanceUpdateInput {
  name?: string;
  category?: string;
  description?: string;
  intervalDays?: number;
  intervalLabel?: string;
  parts?: string;
  notes?: string;
  assignedTo?: string;
  isActive?: boolean;
  nextDueAt?: Date | null;
}

export interface MaintenanceLogInput {
  notes: string;
  partsUsed: string;
  completedAt: Date;
}

export interface RestockCreateInput {
  name: string;
  note: string;
  category: string;
}

export interface VisitCreateInput {
  visitorName: string;
  startDate: Date;
  endDate: Date;
  notes: string;
  bringing: string;
}

export type VisitUpdateInput = Partial<VisitCreateInput>;

export const maintenanceCategories = [
  "water",
  "power",
  "generator",
  "gas",
  "wastewater",
  "pool",
  "internet",
  "grounds",
  "general",
] as const;

export const restockCategories = [
  "kitchen",
  "pantry",
  "bathroom",
  "cleaning",
  "hardware",
  "general",
] as const;

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function stringField(
  value: Record<string, unknown>,
  key: string,
  errors: FieldErrors,
  options: { required?: boolean; max: number }
): string | undefined {
  if (!hasOwn(value, key)) {
    if (options.required) errors[key] = `${key} is required.`;
    return undefined;
  }

  if (typeof value[key] !== "string") {
    errors[key] = `${key} must be a string.`;
    return undefined;
  }

  const parsed = value[key].trim();
  if (options.required && parsed.length === 0) {
    errors[key] = `${key} is required.`;
  } else if (parsed.length > options.max) {
    errors[key] = `${key} must be ${options.max} characters or fewer.`;
  }

  return parsed;
}

function integerField(
  value: Record<string, unknown>,
  key: string,
  errors: FieldErrors,
  options: { required?: boolean; min: number; max: number }
): number | undefined {
  if (!hasOwn(value, key)) {
    if (options.required) errors[key] = `${key} is required.`;
    return undefined;
  }

  const parsed = value[key];
  if (
    typeof parsed !== "number" ||
    !Number.isInteger(parsed) ||
    parsed < options.min ||
    parsed > options.max
  ) {
    errors[key] = `${key} must be a whole number from ${options.min} to ${options.max}.`;
    return undefined;
  }

  return parsed;
}

function booleanField(
  value: Record<string, unknown>,
  key: string,
  errors: FieldErrors
): boolean | undefined {
  if (!hasOwn(value, key)) return undefined;
  if (typeof value[key] !== "boolean") {
    errors[key] = `${key} must be true or false.`;
    return undefined;
  }
  return value[key];
}

function categoryField(
  value: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
  errors: FieldErrors,
  required: boolean
): string | undefined {
  const parsed = stringField(value, key, errors, { required, max: 40 });
  if (parsed !== undefined && parsed.length > 0 && !allowed.includes(parsed)) {
    errors[key] = `${key} is not a supported category.`;
  }
  return parsed;
}

function dateOnlyField(
  value: Record<string, unknown>,
  key: string,
  errors: FieldErrors,
  required: boolean
): Date | undefined {
  if (!hasOwn(value, key)) {
    if (required) errors[key] = `${key} is required.`;
    return undefined;
  }

  const parsed = parseDateOnly(value[key]);
  if (!parsed) {
    errors[key] = `${key} must be a real date in YYYY-MM-DD format.`;
    return undefined;
  }
  return parsed;
}

export function parseMaintenanceParts(value: unknown): MaintenancePart[] {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate)) return [];

  return candidate.flatMap((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) return [];
    const record = part as Record<string, unknown>;
    if (typeof record.name !== "string" || record.name.trim().length === 0) {
      return [];
    }
    const name = record.name.trim();
    const partNumber =
      typeof record.partNumber === "string" ? record.partNumber.trim() : "";
    return [{ name, ...(partNumber ? { partNumber } : {}) }];
  });
}

function partsField(
  value: Record<string, unknown>,
  key: string,
  errors: FieldErrors
): string | undefined {
  if (!hasOwn(value, key)) return undefined;

  let candidate = value[key];
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      errors[key] = `${key} must be a valid parts list.`;
      return undefined;
    }
  }

  if (!Array.isArray(candidate)) {
    errors[key] = `${key} must be an array.`;
    return undefined;
  }
  if (candidate.length > 50) {
    errors[key] = `${key} cannot contain more than 50 parts.`;
    return undefined;
  }

  const parsed: MaintenancePart[] = [];
  candidate.forEach((part, index) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) {
      errors[`${key}.${index}`] = "Each part must be an object.";
      return;
    }

    const record = part as Record<string, unknown>;
    const partErrors: FieldErrors = {};
    const name = stringField(record, "name", partErrors, {
      required: true,
      max: 120,
    });
    const partNumber = stringField(record, "partNumber", partErrors, {
      required: false,
      max: 120,
    });
    Object.entries(partErrors).forEach(([field, message]) => {
      errors[`${key}.${index}.${field}`] = message;
    });
    if (name) parsed.push({ name, ...(partNumber ? { partNumber } : {}) });
  });

  return JSON.stringify(parsed);
}

function result<T>(value: T, errors: FieldErrors): ValidationResult<T> {
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value };
}

export function validateMaintenanceCreate(
  body: Record<string, unknown>
): ValidationResult<MaintenanceCreateInput> {
  const errors: FieldErrors = {};
  const name = stringField(body, "name", errors, { required: true, max: 160 });
  const category = categoryField(
    body,
    "category",
    maintenanceCategories,
    errors,
    true
  );
  const description = stringField(body, "description", errors, {
    max: 2_000,
  });
  const intervalDays = integerField(body, "intervalDays", errors, {
    min: 0,
    max: 36_500,
  });
  const intervalLabel = stringField(body, "intervalLabel", errors, { max: 120 });
  const parts = partsField(body, "parts", errors);
  const notes = stringField(body, "notes", errors, { max: 5_000 });
  const assignedTo = stringField(body, "assignedTo", errors, { max: 160 });

  return result(
    {
      name: name || "",
      category: category || "general",
      description: description || "",
      intervalDays: intervalDays ?? 0,
      intervalLabel:
        intervalLabel || (intervalDays && intervalDays > 0 ? `${intervalDays} days` : "As needed"),
      parts: parts || "[]",
      notes: notes || "",
      assignedTo: assignedTo || "",
    },
    errors
  );
}

export function validateMaintenanceUpdate(
  body: Record<string, unknown>
): ValidationResult<MaintenanceUpdateInput> {
  const errors: FieldErrors = {};
  const value: MaintenanceUpdateInput = {};
  const recognized = [
    "name",
    "category",
    "description",
    "intervalDays",
    "intervalLabel",
    "parts",
    "notes",
    "assignedTo",
    "isActive",
    "nextDueAt",
  ];

  if (hasOwn(body, "name"))
    value.name = stringField(body, "name", errors, { required: true, max: 160 });
  if (hasOwn(body, "category"))
    value.category = categoryField(
      body,
      "category",
      maintenanceCategories,
      errors,
      true
    );
  if (hasOwn(body, "description"))
    value.description = stringField(body, "description", errors, { max: 2_000 });
  if (hasOwn(body, "intervalDays"))
    value.intervalDays = integerField(body, "intervalDays", errors, {
      min: 0,
      max: 36_500,
    });
  if (hasOwn(body, "intervalLabel"))
    value.intervalLabel = stringField(body, "intervalLabel", errors, {
      required: true,
      max: 120,
    });
  if (hasOwn(body, "parts")) value.parts = partsField(body, "parts", errors);
  if (hasOwn(body, "notes"))
    value.notes = stringField(body, "notes", errors, { max: 5_000 });
  if (hasOwn(body, "assignedTo"))
    value.assignedTo = stringField(body, "assignedTo", errors, { max: 160 });
  if (hasOwn(body, "isActive"))
    value.isActive = booleanField(body, "isActive", errors);
  if (hasOwn(body, "nextDueAt")) {
    if (body.nextDueAt === null) {
      value.nextDueAt = null;
    } else {
      value.nextDueAt = dateOnlyField(body, "nextDueAt", errors, true);
    }
  }

  if (!recognized.some((key) => hasOwn(body, key))) {
    errors.body = "At least one maintenance field must be provided.";
  }

  return result(value, errors);
}

export function validateMaintenanceLog(
  body: Record<string, unknown>,
  defaultDate = new Date()
): ValidationResult<MaintenanceLogInput> {
  const errors: FieldErrors = {};
  const notes = stringField(body, "notes", errors, { max: 5_000 });
  const partsUsed = partsField(body, "partsUsed", errors);
  const completedAt = hasOwn(body, "completedAt")
    ? dateOnlyField(body, "completedAt", errors, true)
    : defaultDate;
  if (
    hasOwn(body, "completedAt") &&
    completedAt &&
    completedAt > dateOnlyInTimeZone(defaultDate)
  ) {
    errors.completedAt = "completedAt cannot be in the future.";
  }

  return result(
    {
      notes: notes || "",
      partsUsed: partsUsed || "[]",
      completedAt: completedAt || defaultDate,
    },
    errors
  );
}

export function validateRestockCreate(
  body: Record<string, unknown>
): ValidationResult<RestockCreateInput> {
  const errors: FieldErrors = {};
  const name = stringField(body, "name", errors, { required: true, max: 160 });
  const note = stringField(body, "note", errors, { max: 1_000 });
  const category = hasOwn(body, "category")
    ? categoryField(body, "category", restockCategories, errors, true)
    : "general";

  return result(
    { name: name || "", note: note || "", category: category || "general" },
    errors
  );
}

export function validateRestockAction(
  body: Record<string, unknown>
): ValidationResult<"resolve" | "unresolve"> {
  const errors: FieldErrors = {};
  if (body.action !== "resolve" && body.action !== "unresolve") {
    errors.action = 'action must be either "resolve" or "unresolve".';
  }
  return result(body.action as "resolve" | "unresolve", errors);
}

function validateVisitFields(
  body: Record<string, unknown>,
  partial: boolean
): ValidationResult<VisitUpdateInput> {
  const errors: FieldErrors = {};
  const value: VisitUpdateInput = {};
  const recognized = ["visitorName", "startDate", "endDate", "notes", "bringing"];

  if (!partial || hasOwn(body, "visitorName"))
    value.visitorName = stringField(body, "visitorName", errors, {
      required: true,
      max: 160,
    });
  if (!partial || hasOwn(body, "startDate"))
    value.startDate = dateOnlyField(body, "startDate", errors, true);
  if (!partial || hasOwn(body, "endDate"))
    value.endDate = dateOnlyField(body, "endDate", errors, true);
  if (!partial || hasOwn(body, "notes"))
    value.notes = stringField(body, "notes", errors, { max: 2_000 }) || "";
  if (!partial || hasOwn(body, "bringing"))
    value.bringing = stringField(body, "bringing", errors, { max: 1_000 }) || "";

  if (partial && !recognized.some((key) => hasOwn(body, key))) {
    errors.body = "At least one visit field must be provided.";
  }

  return result(value, errors);
}

export function validateVisitCreate(
  body: Record<string, unknown>
): ValidationResult<VisitCreateInput> {
  const parsed = validateVisitFields(body, false);
  if (!parsed.ok) return parsed;

  const value = parsed.value;
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    return {
      ok: false,
      errors: { endDate: "endDate must be on or after startDate." },
    };
  }

  return {
    ok: true,
    value: value as VisitCreateInput,
  };
}

export function validateVisitUpdate(
  body: Record<string, unknown>
): ValidationResult<VisitUpdateInput> {
  return validateVisitFields(body, true);
}

export function validateVisitDateOrder(
  startDate: Date,
  endDate: Date
): ValidationResult<true> {
  return endDate < startDate
    ? { ok: false, errors: { endDate: "endDate must be on or after startDate." } }
    : { ok: true, value: true };
}
