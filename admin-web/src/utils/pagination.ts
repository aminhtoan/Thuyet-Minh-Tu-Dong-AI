export function paginationItems(page: number, totalPages: number): Array<number | string> {
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) return [];
  const current = Math.min(totalPages, Math.max(1, Math.trunc(page) || 1));
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: Array<number | string> = [];
  for (const p of sorted) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && p - previous === 2) items.push(previous + 1);
    else if (typeof previous === 'number' && p - previous > 2) items.push(`gap-${previous}`);
    items.push(p);
  }
  return items;
}

