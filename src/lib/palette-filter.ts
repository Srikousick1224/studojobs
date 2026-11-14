/** Every typed word must appear somewhere in the label (case-insensitive). */
export function filterItems<T extends { label: string }>(items: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((i) => words.every((w) => i.label.toLowerCase().includes(w)));
}
