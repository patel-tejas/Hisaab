import type { SerinAgentIconId } from "@/lib/landing/serin-agent-icons"

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tradehisaab.com"

export const HISAAB_LLMS_TXT_URL = `${SITE}/llms.txt`

export const HISAAB_AGENT_PROMPT = `I just came across Hisaab and want to understand it properly before I try the demo or create an account.

Read the documentation at ${HISAAB_LLMS_TXT_URL} and the key pages it links to, then give me a clear, honest breakdown:

What Hisaab is and what specific problem it's built to fix for traders
How the trading journal actually works — logging fills, psychology, strategies, and session review
How a trader goes from taking a trade to a cleaner next session, step by step
What analytics and AI insights surface from the journal (equity, win rate, mistakes, calendar heat) and why that matters
Where Hisaab fits compared to what I'm probably already using — Excel sheets, Discord trackers, or broker apps
What broker sync does today (Dhan) versus what's still coming, without overselling
What it's genuinely not built for — honest scope, not a pitch

Write this the way a sharp product expert would brief me before a 30-minute walkthrough. No buzzwords. Tell me how it actually works.`

export type HisaabAgentPlatform = {
  id: SerinAgentIconId
  name: string
  href: string
  /** NotebookLM lacks native URL prefills — copy prompt on click. */
  copyPromptOnClick?: boolean
}

/** Footer display order */
export const HISAAB_AGENT_FOOTER_IDS = [
  "chatgpt",
  "gemini",
  "claude",
  "perplexity",
  "grok",
  "notebooklm",
] as const

export const HISAAB_AGENT_PLATFORMS: HisaabAgentPlatform[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    href: `https://chatgpt.com/?${new URLSearchParams({
      hints: "search",
      prompt: HISAAB_AGENT_PROMPT,
    })}`,
  },
  {
    id: "gemini",
    name: "Gemini",
    href: `https://www.google.com/search?${new URLSearchParams({
      q: HISAAB_AGENT_PROMPT,
      udm: "50",
      ref: "gemini",
    })}`,
  },
  {
    id: "claude",
    name: "Claude",
    href: `https://claude.ai/new?${new URLSearchParams({ q: HISAAB_AGENT_PROMPT })}`,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    href: `https://www.perplexity.ai/search?q=${encodeURIComponent(HISAAB_AGENT_PROMPT)}`,
  },
  {
    id: "grok",
    name: "Grok",
    href: `https://grok.com/?q=${encodeURIComponent(HISAAB_AGENT_PROMPT)}`,
  },
  {
    id: "notebooklm",
    name: "NotebookLM",
    href: "https://notebooklm.google.com/",
    copyPromptOnClick: true,
  },
  {
    id: "serin-docs",
    name: "Hisaab Docs",
    href: HISAAB_LLMS_TXT_URL,
  },
]

export function getHisaabAgentPlatformsForFooter(): HisaabAgentPlatform[] {
  return HISAAB_AGENT_FOOTER_IDS.map(
    (id) => HISAAB_AGENT_PLATFORMS.find((platform) => platform.id === id)!
  )
}

export function getHisaabAgentAriaLabel(platform: HisaabAgentPlatform): string {
  if (platform.id === "serin-docs") {
    return "Read Hisaab llms.txt documentation"
  }
  return `Learn about Hisaab on ${platform.name}`
}
