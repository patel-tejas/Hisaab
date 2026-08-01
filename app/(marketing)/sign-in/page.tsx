"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "@/utils/supabase/client"
import { AuthSplitShell } from "@/components/marketing/auth-split-shell"
import { TryDemoNotice } from "@/components/marketing/try-demo-notice"

const DEMO_EMAIL = "test@tradehisaab.com"
const DEMO_PASSWORD = "test@tradehisaab.coM1"

const fieldClass =
  "w-full rounded-xl border border-[#c5d8ef] bg-pure px-5 py-3 font-marketing text-[15px] text-void placeholder:text-fog outline-none transition-[border-color,box-shadow] duration-200 focus:border-cyan-signal focus:shadow-[0_0_0_3px_rgba(0,179,221,0.15)]"

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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setEmail(DEMO_EMAIL)
      setPassword(DEMO_PASSWORD)
      toast.success("Demo credentials filled")
    }
  }, [])

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
    <AuthSplitShell
      floatingNotice={<TryDemoNotice onClick={fillDemoCredentials} />}
    >
      <h1 className="font-display text-[42px] leading-[0.95] tracking-[-0.02em] text-void">
        Sign in
      </h1>
      <p className="mt-2 font-marketing text-[16px] text-fog">
        Welcome back to Hisaab.
      </p>

      <form className="mt-12 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="font-marketing text-[14px] font-medium text-void/80"
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
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="font-marketing text-[14px] font-medium text-void/80"
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
              className={`${fieldClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fog transition-colors duration-200 hover:text-void"
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
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#1e3a5f] px-5 py-3.5 font-marketing text-[16px] font-medium text-pure transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-8 text-center font-marketing text-[14px] text-fog">
        New to Hisaab?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-cyan-signal transition-opacity duration-200 hover:opacity-80"
        >
          Create an account
        </Link>
      </p>
    </AuthSplitShell>
  )
}
