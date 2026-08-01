function JournalMock() {
  const bars = [28, 42, 35, 58, 48, 72, 64, 80, 70, 88, 76, 92]
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[40px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,179,221,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative overflow-hidden rounded-[24px] border border-void/10 bg-[#12141a] p-5 shadow-[0_28px_60px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono-label text-[10px] uppercase tracking-[0.16em] text-ash">
              Session equity
            </p>
            <p className="mt-1 font-display text-[28px] leading-none text-pure">+₹12,840</p>
          </div>
          <span className="rounded-full bg-cyan-signal/15 px-2.5 py-1 font-mono-label text-[10px] font-medium uppercase tracking-[0.12em] text-cyan-signal">
            Live
          </span>
        </div>

        <div className="relative mt-5 h-[120px]">
          <svg viewBox="0 0 240 100" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="proof-equity-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00b3dd" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00b3dd" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 78 C20 74, 30 62, 45 58 C60 54, 70 68, 90 52 C110 36, 125 42, 145 30 C165 18, 180 28, 200 16 C215 8, 228 12, 240 8 L240 100 L0 100 Z"
              fill="url(#proof-equity-fill)"
            />
            <path
              d="M0 78 C20 74, 30 62, 45 58 C60 54, 70 68, 90 52 C110 36, 125 42, 145 30 C165 18, 180 28, 200 16 C215 8, 228 12, 240 8"
              fill="none"
              stroke="#00b3dd"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="mt-4 flex items-end gap-1">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-pure/15"
              style={{ height: `${h * 0.45}px` }}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { k: "Win rate", v: "64%" },
            { k: "Expectancy", v: "₹420" },
            { k: "Mood", v: "Calm" },
          ].map((m) => (
            <div
              key={m.k}
              className="rounded-xl border border-pure/8 bg-pure/5 px-2.5 py-2"
            >
              <p className="font-mono-label text-[8px] uppercase tracking-[0.12em] text-ash">
                {m.k}
              </p>
              <p className="mt-0.5 font-marketing text-[13px] font-medium text-pure">{m.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Early-access proof band — silver canvas with journal visuals. */
export function ProofSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#090a0b] via-[#0c1016] to-[#0a0b0e]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#090a0b] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-[#0a0b0e]"
      />

      <div className="relative z-[1] mx-auto w-full max-w-[1200px]">
        <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#e8e8ea] via-silver to-[#b8b8bc] p-8 text-void shadow-[0_40px_80px_rgba(0,0,0,0.35)] sm:p-12 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div>
              <p className="font-mono-label text-[12px] font-medium uppercase tracking-[0.18em] text-void/55">
                Early access
              </p>
              <h2 className="mt-4 max-w-[540px] font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.95] tracking-[-0.02em]">
                Built for traders who review more than they refresh charts
              </h2>
              <p className="mt-5 max-w-[440px] font-marketing text-[16px] leading-[1.55] text-void/75">
                Hisaab keeps the dashboard honest: P&amp;L, psychology, calendar heat, and strategy
                splits — without turning journaling into another noisy terminal.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {["Equity curves", "Psychology", "Calendar heat"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-void/12 bg-pure/40 px-3 py-1 font-mono-label text-[10px] uppercase tracking-[0.14em] text-void/65"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <JournalMock />
          </div>
        </div>
      </div>
    </section>
  )
}
