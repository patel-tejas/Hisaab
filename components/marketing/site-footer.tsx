import Link from "next/link"
import { HisaabLogo } from "@/components/marketing/hisaab-logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-pure/8 bg-abyss">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-5 py-12 sm:flex-row sm:px-8">
        <HisaabLogo tone="light" />

        <div className="flex items-center gap-6 font-marketing text-[14px] text-ash">
          <Link href="/sign-in" className="transition-colors duration-200 hover:text-pure">
            Log in
          </Link>
          <Link href="/sign-up" className="transition-colors duration-200 hover:text-pure">
            Get started
          </Link>
          <Link href="#features" className="transition-colors duration-200 hover:text-pure">
            Features
          </Link>
        </div>

        <p className="font-mono-label text-[11px] uppercase tracking-[0.16em] text-fog">
          © {new Date().getFullYear()} Hisaab
        </p>
      </div>
    </footer>
  )
}
