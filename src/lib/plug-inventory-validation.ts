export type PlugInventoryType = "tapo" | "shelly" | "manual";

export interface PlugInventoryCreateInput {
  name: string;
  type: PlugInventoryType;
  deviceId: string;
  ip: string;
  room: string;
}

export interface PlugInventoryUpdateInput {
  name?: string;
  room?: string;
}

type FieldErrors = Record<string, string>;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

const PLUG_TYPES = new Set<PlugInventoryType>(["tapo", "shelly", "manual"]);

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function stringField(
  body: Record<string, unknown>,
  key: string,
  errors: FieldErrors,
  options: { required?: boolean; max: number }
): string | undefined {
  if (!hasOwn(body, key)) {
    if (options.required) errors[key] = `${key} is required.`;
    return undefined;
  }

  if (typeof body[key] !== "string") {
    errors[key] = `${key} must be a string.`;
    return undefined;
  }

  const value = body[key].trim();
  if (options.required && value.length === 0) {
    errors[key] = `${key} is required.`;
  } else if (value.length > options.max) {
    errors[key] = `${key} must be ${options.max} characters or fewer.`;
  }
  return value;
}

export function validatePlugInventoryCreate(
  body: Record<string, unknown>
): ValidationResult<PlugInventoryCreateInput> {
  const errors: FieldErrors = {};
  const name = stringField(body, "name", errors, { required: true, max: 160 });
  const deviceId = stringField(body, "deviceId", errors, {
    required: true,
    max: 200,
  });
  const ip = hasOwn(body, "ip")
    ? stringField(body, "ip", errors, { max: 200 })
    : "";
  const room = hasOwn(body, "room")
    ? stringField(body, "room", errors, { max: 160 })
    : "";

  let type: PlugInventoryType = "tapo";
  if (hasOwn(body, "type")) {
    const candidate = stringField(body, "type", errors, { required: true, max: 40 });
    if (candidate && PLUG_TYPES.has(candidate as PlugInventoryType)) {
      type = candidate as PlugInventoryType;
    } else if (candidate) {
      errors.type = "type must be tapo, shelly, or manual.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: name!,
      type,
      deviceId: deviceId!,
      ip: ip || "",
      room: room || "",
    },
  };
}

export function validatePlugInventoryUpdate(
  body: Record<string, unknown>
): ValidationResult<PlugInventoryUpdateInput> {
  const errors: FieldErrors = {};
  const value: PlugInventoryUpdateInput = {};

  if (hasOwn(body, "name")) {
    value.name = stringField(body, "name", errors, { required: true, max: 160 });
  }
  if (hasOwn(body, "room")) {
    value.room = stringField(body, "room", errors, { max: 160 });
  }
  if (!hasOwn(body, "name") && !hasOwn(body, "room")) {
    errors.body = "At least one inventory field must be provided.";
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value };
}
