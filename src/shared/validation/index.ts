// Minimal validation utilities for Phase 2. These are intentionally lightweight and dependency-free.

export function isEmail(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /.+@.+\..+/.test(value);
}

export function requiredFields(
  obj: Record<string, unknown>,
  fields: string[],
): string[] {
  const missing: string[] = [];
  fields.forEach((f) => {
    if (obj[f] === undefined || obj[f] === null || obj[f] === "")
      missing.push(f);
  });
  return missing;
}

export function validateDTO<T>(
  dto: T,
  validators: Partial<Record<keyof T, (v: unknown) => boolean>>,
): string[] {
  const errors: string[] = [];
  Object.keys(validators).forEach((k) => {
    // @ts-expect-error dynamic access
    const validator = validators[k as keyof T];
    // @ts-expect-error dynamic access
    const value = (dto as any)[k];
    if (validator && !validator(value)) errors.push(String(k));
  });
  return errors;
}
