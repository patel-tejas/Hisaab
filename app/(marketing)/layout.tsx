import type React from "react"

/**
 * Public marketing shell — Origin/DESIGN.md surfaces.
 * Dashboard routes are outside this group and keep existing styles.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="marketing-root min-h-screen">{children}</div>
}
