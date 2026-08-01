import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/next"
import { Plus_Jakarta_Sans, Instrument_Serif, Manrope, Roboto_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

/** Quiet premium display — H1s / section titles */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
})

/** UI / body — neo-grotesque */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-marketing",
  display: "swap",
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-label",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Hisaab — Own every trade you take",
  description:
    "Hisaab is a trading journal for serious process — log fills, track psychology, and review performance without the noise.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${instrumentSerif.variable} ${manrope.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster richColors position="top-center" closeButton />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
