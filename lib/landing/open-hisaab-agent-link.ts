"use client"

import type { MouseEvent } from "react"
import { toast } from "sonner"
import {
  HISAAB_AGENT_PROMPT,
  type HisaabAgentPlatform,
} from "@/lib/landing/hisaab-agent-redirects"

export async function openHisaabAgentLink(
  platform: HisaabAgentPlatform
): Promise<void> {
  if (platform.copyPromptOnClick) {
    try {
      await navigator.clipboard.writeText(HISAAB_AGENT_PROMPT)
      toast.success("Prompt copied. Paste into NotebookLM and send.")
    } catch {
      toast.message("Copy the prompt, then paste into NotebookLM.")
    }
  }

  window.open(platform.href, "_blank", "noopener,noreferrer")
}

export function handleHisaabAgentLinkClick(
  platform: HisaabAgentPlatform,
  event: MouseEvent<HTMLAnchorElement>
): void {
  if (!platform.copyPromptOnClick) return
  event.preventDefault()
  void openHisaabAgentLink(platform)
}
