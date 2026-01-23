export function dedupeStrings(items: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen: Record<string, true> = {};
  for (let i = 0; i < items.length; i++) {
    const v = items[i];
    if (!v) continue;
    if (!seen[v]) {
      seen[v] = true;
      out.push(v);
    }
  }
  return out;
}

