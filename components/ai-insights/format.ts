export function formatInr(n: number): string {
  const abs = Math.abs(Math.round(n))
  const formatted = abs.toLocaleString("en-IN")
  if (n > 0) return `+₹${formatted}`
  if (n < 0) return `-₹${formatted}`
  return `₹${formatted}`
}

export function formatInrPlain(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`
}

export function truncateSentences(text: string, max = 2): { short: string; hasMore: boolean } {
  if (!text) return { short: "", hasMore: false }
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
  if (parts.length <= max) return { short: text.trim(), hasMore: false }
  return { short: parts.slice(0, max).join(" ").trim(), hasMore: true }
}

export function normalizeActions(
  items: ({ text: string; priority?: "high" | "quick-win" | "long-term" } | string)[]
): { text: string; priority?: "high" | "quick-win" | "long-term" }[] {
  return items.map((item) => (typeof item === "string" ? { text: item } : item))
}
