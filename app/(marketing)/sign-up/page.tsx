"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "@/utils/supabase/client"

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
            name: name.trim() || username.trim(),
          },
        },
      })

      if (error) {
        toast.error(error.message || "Signup failed")
      } else {
        toast.success("Account created successfully")
        if (data.session) {
          window.location.href = "/dashboard"
        } else {
          toast.info("Check your email for a confirmation link if required.")
          window.location.href = "/sign-in"
        }
      }
    } catch {
      toast.error("An unexpected error occurred during signup")
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
            href="/sign-in"
            className="font-marketing text-[16px] text-ash transition-colors duration-200 hover:text-pure"
          >
            Log in
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12 lg:flex-row lg:items-stretch lg:gap-12 lg:py-16">
          <aside className="mb-8 w-full max-w-md lg:mb-0 lg:flex lg:max-w-[340px] lg:flex-col lg:justify-center">
            <div className="rounded-[30px] bg-silver p-8 text-void">
              <p className="font-mono-label text-[12px] font-medium uppercase tracking-[0.18em] text-void/55">
                Prefer a tour?
              </p>
              <h2 className="mt-3 font-display text-[32px] leading-[1.05]">
                Try the demo first
              </h2>
              <p className="mt-3 font-marketing text-[14px] leading-[1.67] text-void/70">
                No sign-up needed. Walk a pre-filled journal before you commit.
              </p>
              <Link
                href="/sign-in"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-void px-[18px] py-3 font-marketing text-[16px] text-pure transition-opacity duration-200 hover:opacity-90"
              >
                Open demo sign-in
                <span aria-hidden>→</span>
              </Link>
            </div>
          </aside>

          <div className="flex w-full max-w-md flex-col justify-center">
            <div className="rounded-[16px] bg-graphite p-8 sm:p-10">
              <h1 className="font-display text-[38px] leading-[0.9] text-pure">
                Create account
              </h1>
              <p className="mt-3 font-marketing text-[16px] font-light text-ash">
                Start your trading ledger with Hisaab
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="username"
                      className="font-mono-label text-[12px] font-medium uppercase tracking-[0.16em] text-ash"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="trader_joe"
                      className="w-full rounded-[8px] border border-pure/10 bg-void px-4 py-3 font-marketing text-[16px] text-cloud placeholder:text-fog outline-none transition-[border-color] duration-200 focus:border-pure/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="font-mono-label text-[12px] font-medium uppercase tracking-[0.16em] text-ash"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder="Trader Joe"
                      className="w-full rounded-[8px] border border-pure/10 bg-void px-4 py-3 font-marketing text-[16px] text-cloud placeholder:text-fog outline-none transition-[border-color] duration-200 focus:border-pure/30"
                    />
                  </div>
                </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-[8px] border border-pure/10 bg-void px-[22px] py-3 font-marketing text-[16px] text-cloud placeholder:text-fog outline-none transition-[border-color] duration-200 focus:border-pure/30"
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Create a password"
                      className="w-full rounded-[8px] border border-pure/10 bg-void px-[22px] py-3 pr-12 font-marketing text-[16px] text-cloud placeholder:text-fog outline-none transition-[border-color] duration-200 focus:border-pure/30"
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
                  {loading ? "Creating account…" : "Sign up"}
                  {!loading && <span aria-hidden>→</span>}
                </button>
              </form>

              <p className="mt-8 border-t border-pure/10 pt-6 text-center font-marketing text-[14px] text-ash">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-pure transition-opacity duration-200 hover:opacity-80">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
