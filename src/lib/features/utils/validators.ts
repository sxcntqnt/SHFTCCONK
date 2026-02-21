// lib/utils/validators.ts

export function isEmail(value: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value);
}

export function isNonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value: any): boolean {
  return typeof value === 'number' && value > 0;
}

export function isValidUUID(value: string): boolean {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(value);
}

export function isDateString(value: string): boolean {
  return !isNaN(Date.parse(value));
}

export function requireField<T>(obj: T, key: keyof T): void {
  if (obj[key] === undefined || obj[key] === null) {
    throw new Error(`Missing required field: ${String(key)}`);
  }
}