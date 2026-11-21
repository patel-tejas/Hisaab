"use client"

import { useEffect, useEffectEvent } from "react"
import { useRouter } from "next/navigation"
import { Moon, Plus, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { NAV_MAIN, NAV_SECONDARY } from "@/lib/nav"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewTrade: () => void
}

/**
 * Cmd/Ctrl+K palette: jump to any page, or run one of a few actions.
 * The pages come from lib/nav.ts, the same list the sidebar renders.
 */
export function CommandPalette({ open, onOpenChange, onNewTrade }: CommandPaletteProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  // The handler always sees the latest `open`, but the listener is attached once.
  const toggle = useEffectEvent(() => onOpenChange(!open))

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const run = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem value="new trade add log trade" onSelect={() => run(onNewTrade)}>
            <Plus />
            New trade
          </CommandItem>
          <CommandItem value={`switch to ${nextTheme} theme mode`} onSelect={() => run(() => setTheme(nextTheme))}>
            {nextTheme === "dark" ? <Moon /> : <Sun />}
            Switch to {nextTheme} theme
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {[...NAV_MAIN, ...NAV_SECONDARY].map((item) => (
            <CommandItem
              key={item.url}
              value={`go to ${item.title}`}
              onSelect={() => run(() => router.push(item.url))}
            >
              <item.icon />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
