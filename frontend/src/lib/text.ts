/** Join a short list for prose: `[]`→"", `[a]`→"a", `[a,b]`→"a and b", `[a,b,c]`→"a, b and c". */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
