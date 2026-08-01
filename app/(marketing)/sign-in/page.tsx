"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "@/utils/supabase/client"

const DEMO_EMAIL = "test@tradehisaab.com"
const DEMO_PASSWORD = "test@tradehisaab.coM1"

export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function fillDemoCredentials() {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    toast.success("Demo credentials filled")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || "Invalid email or password")
      } else {
        toast.success("Signed in successfully")
        window.location.href = "/dashboard"
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-obsidian">
      <div className="pointer-events-none absolute inset-0 bg-sky-atmosphere opacity-40" />

      <div className="relative mx-auto flex min-h-screen max-w-[1200px] flex-col px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-pure text-void font-marketing text-[14px] font-medium">
              H
            </span>
            <span className="font-display text-[22px] text-pure">Hisaab</span>
          </Link>
          <Link
            href="/sign-up"
            className="font-marketing text-[16px] text-ash transition-colors duration-200 hover:text-pure"
          >
            Create account
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12 lg:flex-row lg:items-stretch lg:gap-12 lg:py-16">
          {/* Demo invite — silver inverted card */}
          <aside className="mb-8 w-full max-w-md lg:mb-0 lg:flex lg:max-w-[340px] lg:flex-col lg:justify-center">
            <div className="rounded-[30px] bg-silver p-8 text-void">
              <p className="font-mono-label text-[12px] font-medium uppercase tracking-[0.18em] text-void/55">
                Free demo
              </p>
              <h2 className="mt-3 font-display text-[32px] leading-[1.05]">
                Try Demo Account
              </h2>
              <p className="mt-3 font-marketing text-[14px] leading-[1.67] text-void/70">
                Explore a pre-filled journal — real trades, analytics, and psychology data.
              </p>
              <div className="mt-5 space-y-1 font-mono-label text-[12px] uppercase tracking-[0.08em] text-void/70">
                <p>
                  Email{" "}
                  <span className="normal-case tracking-normal text-void">{DEMO_EMAIL}</span>
                </p>
                <p>
                  Pass{" "}
                  <span className="normal-case tracking-normal text-void">{DEMO_PASSWORD}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-void px-[18px] py-3 font-marketing text-[16px] text-pure transition-opacity duration-200 hover:opacity-90"
              >
                Use demo credentials
                <span aria-hidden>→</span>
              </button>
            </div>
          </aside>

          {/* Auth form */}
          <div className="flex w-full max-w-md flex-col justify-center">
            <div className="rounded-[16px] bg-graphite p-8 sm:p-10">
              <h1 className="font-display text-[38px] leading-[0.9] text-pure">
                Welcome back
              </h1>
              <p className="mt-3 font-marketing text-[16px] font-light text-ash">
                Sign in to continue to Hisaab
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="font-mono-label text-[12px] font-medium uppercase tracking-[0.16em] text-ash"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-[8px] border border-pure/10 bg-void px-[22px] py-3 font-marketing text-[16px] text-cloud placeholder:text-fog outline-none transition-[border-color,background-color] duration-200 focus:border-pure/30"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="font-mono-label text-[12px] font-medium uppercase tracking-[0.16em] text-ash"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full rounded-[8px] border border-pure/10 bg-void px-[22px] py-3 pr-12 font-marketing text-[16px] text-cloud placeholder:text-fog outline-none transition-[border-color,background-color] duration-200 focus:border-pure/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fog transition-colors duration-200 hover:text-pure"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-pure px-[18px] py-3 font-marketing text-[16px] text-void transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign in"}
                  {!loading && <span aria-hidden>→</span>}
                </button>
              </form>

              <p className="mt-8 border-t border-pure/10 pt-6 text-center font-marketing text-[14px] text-ash">
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="text-pure transition-opacity duration-200 hover:opacity-80">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
