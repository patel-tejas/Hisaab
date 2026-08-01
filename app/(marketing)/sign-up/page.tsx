"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "@/utils/supabase/client"
import { AuthSplitShell } from "@/components/marketing/auth-split-shell"
import { TryDemoNotice } from "@/components/marketing/try-demo-notice"

const fieldClass =
  "w-full rounded-xl border border-[#c5d8ef] bg-pure px-5 py-3 font-marketing text-[15px] text-void placeholder:text-fog outline-none transition-[border-color,box-shadow] duration-200 focus:border-cyan-signal focus:shadow-[0_0_0_3px_rgba(0,179,221,0.15)]"

export default function SignUpPage() {
  const router = useRouter()
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
    <AuthSplitShell
      headline={
        <>
          Start your ledger.
          <br />
          Track every fill.
          <br />
          <span className="text-void/45">Improve with data.</span>
        </>
      }
      floatingNotice={
        <TryDemoNotice onClick={() => router.push("/sign-in?demo=1")} />
      }
    >
      <h1 className="font-display text-[42px] leading-[0.95] tracking-[-0.02em] text-void">
        Create account
      </h1>
      <p className="mt-2 font-marketing text-[16px] text-fog">
        Start your trading journal with Hisaab.
      </p>

      <form className="mt-12 space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="font-marketing text-[14px] font-medium text-void/80"
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
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="font-marketing text-[14px] font-medium text-void/80"
            >
              Full name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Trader Joe"
              className={fieldClass}
            />
          </div>
        </div>

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
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Create a password"
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center font-marketing text-[14px] text-fog">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-cyan-signal transition-opacity duration-200 hover:opacity-80"
        >
          Sign in
        </Link>
      </p>
    </AuthSplitShell>
  )
}
