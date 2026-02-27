export function isValidTokenKey(key: string): boolean {
  // Conservative: letters/numbers/_/- segments separated by dots.
  // Examples: "color.primary", "font.body.sm.size", "spacing.4"
  return /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i.test(key);
}

export function splitTokenKey(key: string): string[] {
  return key.split(".").filter(Boolean);
}

export function joinTokenKey(parts: string[]): string {
  return parts.filter(Boolean).join(".");
}

