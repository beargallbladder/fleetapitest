export const DEFAULT_ZIP = "92101";

export function normalizeZip(input: string | null | undefined): string {
  const z = String(input || "").trim();
  // Basic US ZIP5 support (demo). If invalid/missing, fall back.
  if (/^\d{5}$/.test(z)) return z;
  return DEFAULT_ZIP;
}

