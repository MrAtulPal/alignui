export function asJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
