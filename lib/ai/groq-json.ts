import { Groq } from "groq-sdk"

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

/**
 * One JSON-mode chat completion with a hard timeout.
 * Returns the raw text and the parsed object (null when it is not valid JSON).
 */
export async function chatJson(args: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  timeoutMs: number
  temperature?: number
}): Promise<{ text: string; json: unknown | null }> {
  const groq = new Groq({ apiKey: args.apiKey })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Math.max(1_000, args.timeoutMs))
  try {
    const result = await groq.chat.completions.create(
      {
        messages: args.messages,
        model: args.model,
        response_format: { type: "json_object" },
        temperature: args.temperature ?? 0.2,
      },
      { signal: controller.signal }
    )
    const text = result.choices[0]?.message?.content?.trim() || ""
    try {
      return { text, json: JSON.parse(text) }
    } catch {
      return { text, json: null }
    }
  } finally {
    clearTimeout(timer)
  }
}
