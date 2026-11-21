"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import {
    Link2, Unlink, Shield, Clock, CheckCircle2,
    AlertTriangle, ExternalLink, Loader2, Eye, EyeOff, Zap, ArrowLeft, KeyRound,
} from "lucide-react"
import Image from "next/image"

/* ──────────────── Types ──────────────── */
type SupportedBroker = "dhan" | "sahi"
type SahiKeyType = "regular" | "totp"

interface BrokerStatus {
    broker: string
    clientId: string
    isActive: boolean
    lastSynced: string | null
}

interface SyncResult {
    success: boolean
    imported: number
    skipped: number
    total?: number
    paired?: number
    message: string
}

/* ═══════════════════════════════════════════════════════════════════════
   BROKER SETTINGS PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function BrokerPage() {
    const [brokers, setBrokers] = useState<BrokerStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
    const [selectedBroker, setSelectedBroker] = useState<SupportedBroker | null>(null)

    // Shared form state (cleared on broker switch)
    const [clientId, setClientId] = useState("")
    const [accessToken, setAccessToken] = useState("")
    const [showToken, setShowToken] = useState(false)
    const [connectError, setConnectError] = useState("")
    const [connectSuccess, setConnectSuccess] = useState("")

    // Sahi-specific TOTP options
    const [sahiKeyType, setSahiKeyType] = useState<SahiKeyType>("regular")
    const [sahiTotpSecret, setSahiTotpSecret] = useState("")
    const [sahiTotpCode, setSahiTotpCode] = useState("")
    const [showTotpSecret, setShowTotpSecret] = useState(false)
    const [syncTotpCode, setSyncTotpCode] = useState("")

    const dhan = brokers.find((b) => b.broker === "dhan")
    const sahi = brokers.find((b) => b.broker === "sahi")

    const openBroker = (broker: SupportedBroker) => {
        setSelectedBroker(broker)
        setClientId("")
        setAccessToken("")
        setShowToken(false)
        setConnectError("")
        setConnectSuccess("")
        setSyncResult(null)
        setSahiKeyType("regular")
        setSahiTotpSecret("")
        setSahiTotpCode("")
        setSyncTotpCode("")
    }

    /* ── Fetch status ── */
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/broker/status")
            if (res.ok) {
                const data = await res.json()
                setBrokers(data.brokers || [])
            }
        } catch { }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchStatus() }, [fetchStatus])

    /* ── Connect ── */
    const handleConnect = async (broker: SupportedBroker) => {
        if (!clientId.trim() || !accessToken.trim()) {
            setConnectError(
                broker === "sahi"
                    ? "Both API Key ID (pk_...) and API Secret (sahi_sk_...) are required"
                    : "Both Client ID and Access Token are required"
            )
            return
        }

        if (broker === "sahi" && sahiKeyType === "totp" && !sahiTotpSecret.trim() && !sahiTotpCode.trim()) {
            setConnectError("Enter either your TOTP Setup Key (for auto-approval) or a 6-digit TOTP code")
            return
        }

        setConnecting(true)
        setConnectError("")
        setConnectSuccess("")
        try {
            const body: Record<string, string> = {
                broker,
                clientId: clientId.trim(),
                accessToken: accessToken.trim(),
            }
            if (broker === "sahi" && sahiKeyType === "totp") {
                if (sahiTotpSecret.trim()) body.totpSecret = sahiTotpSecret.trim()
                if (sahiTotpCode.trim()) body.totp = sahiTotpCode.trim()
            }

            const res = await fetch("/api/broker/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setConnectSuccess(`${broker === "sahi" ? "Sahi" : "Dhan"} connected successfully!`)
            setClientId("")
            setAccessToken("")
            setSahiTotpSecret("")
            setSahiTotpCode("")
            fetchStatus()
        } catch (err: any) {
            setConnectError(err.message)
        } finally { setConnecting(false) }
    }

    /* ── Disconnect ── */
    const handleDisconnect = async (broker: SupportedBroker) => {
        setDisconnecting(true)
        try {
            const res = await fetch("/api/broker/connect", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ broker }),
            })
            if (res.ok) {
                fetchStatus()
                setConnectSuccess("")
                setSyncResult(null)
                setSyncTotpCode("")
            }
        } catch { }
        finally { setDisconnecting(false) }
    }

    /* ── Sync ── */
    const handleSync = async (broker: SupportedBroker) => {
        setSyncing(true)
        setSyncResult(null)
        try {
            const payload: Record<string, string> = { broker }
            if (broker === "sahi" && syncTotpCode.trim()) {
                payload.totp = syncTotpCode.trim()
            }

            const res = await fetch("/api/broker/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSyncResult(data)
            setSyncTotpCode("")
            fetchStatus()
        } catch (err: any) {
            setSyncResult({ success: false, imported: 0, skipped: 0, message: err.message })
        } finally { setSyncing(false) }
    }

    /* ═══════════════════════════ RENDER LIST ═══════════════════════════ */
    const renderBrokerList = () => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Dhan Card */}
            <Card
                onClick={() => openBroker("dhan")}
                className="group relative overflow-hidden cursor-pointer transition-all duration-300 border-cyan-500/20 hover:border-cyan-500/40"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-cyan-500/20 relative shadow-cyan-500/10 group-hover:scale-105 transition-transform">
                        <Image src="/dhan_logo.jpg" alt="Dhan" fill className="object-cover" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Dhan</h3>
                        <p className="text-xs text-muted-foreground">Indian Stock Market</p>
                    </div>
                    {dhan ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="size-4" /> Connected
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
                            <Link2 className="size-4" /> Connect Now
                        </div>
                    )}
                </div>
            </Card>

            {/* Sahi Card */}
            <Card
                onClick={() => openBroker("sahi")}
                className="group relative overflow-hidden cursor-pointer transition-all duration-300 border-emerald-500/20 hover:border-emerald-500/40"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-emerald-500/20 relative shadow-emerald-500/10 group-hover:scale-105 transition-transform bg-black">
                        <Image src="/sahi_logo.png" alt="Sahi" fill className="object-cover" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Sahi</h3>
                        <p className="text-xs text-muted-foreground">Indian Stock Market • Free API</p>
                    </div>
                    {sahi ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="size-4" /> Connected
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                            <Link2 className="size-4" /> Connect Now
                        </div>
                    )}
                </div>
            </Card>

            {/* Other Brokers Placeholder */}
            {[
                { name: "Zerodha", logo: "/zerodha_logo.png" },
                { name: "AngelOne", logo: "/angelone_logo.png" },
                { name: "Upstox", logo: "/upstox_logo.png" },
                { name: "Groww", logo: "/groww_logo.png" },
                { name: "Fyers", logo: "/fyers_logo.jpg" },
            ].map((broker) => (
                <Card key={broker.name} className="relative overflow-hidden opacity-60 border-dashed hover:opacity-80 transition-opacity">
                    <div className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl overflow-hidden border border-border/50 relative bg-white">
                            <Image
                                src={broker.logo}
                                alt={broker.name}
                                fill
                                className="object-contain p-2"
                            />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-muted-foreground">{broker.name}</h3>
                            <p className="text-xs text-muted-foreground">Coming Soon</p>
                        </div>
                        <div className="label-mono px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground">
                            Integration Soon
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )

    /* ═══════════════════════════ DHAN DETAILS ═══════════════════════════ */
    const renderDhanDetails = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <Button
                variant="ghost"
                onClick={() => setSelectedBroker(null)}
                className="gap-2 text-muted-foreground hover:text-foreground pl-0"
            >
                <span className="p-1 rounded-md bg-muted/50"><ArrowLeft className="size-4" /></span>
                Back to Brokers
            </Button>

            <Card className="glass-card relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-[.06] bg-cyan-500" />
                <div className="relative z-10 p-6 md:p-8">
                    {/* Broker title bar */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl overflow-hidden border border-cyan-500/20 relative shadow-cyan-500/10">
                                <Image src="/dhan_logo.jpg" alt="Dhan" fill className="object-cover" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Dhan</h2>
                                <p className="text-xs text-muted-foreground">Indian Stock Market Broker</p>
                            </div>
                        </div>
                        {dhan ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 rounded-full border border-[var(--success)]/20">
                                <CheckCircle2 className="size-4" /> Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                                Not Connected
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                        </div>
                    ) : dhan ? (
                        /* ── Connected View ── */
                        <div className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="label-mono text-muted-foreground mb-1">Client ID</p>
                                    <p className="text-sm font-mono text-foreground">{dhan.clientId}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="label-mono text-muted-foreground mb-1">Status</p>
                                    <p className="text-sm text-[var(--success)] font-medium flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" /> Active
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="label-mono text-muted-foreground mb-1">Last Synced</p>
                                    <p className="text-sm text-foreground flex items-center gap-1.5">
                                        <Clock className="size-4 text-muted-foreground" />
                                        {dhan.lastSynced
                                            ? new Date(dhan.lastSynced).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                                            : "Never"
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <Button
                                    onClick={() => handleSync("dhan")}
                                    disabled={syncing}
                                    className="bg-gradient-to-r from-cyan-600 to-[var(--primary)] hover:from-cyan-700 hover:to-[var(--primary)] text-white shadow-cyan-500/20 gap-2"
                                >
                                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                    {syncing ? "Syncing..." : "Sync Today's Trades"}
                                </Button>
                                <Button
                                    onClick={() => handleDisconnect("dhan")}
                                    disabled={disconnecting}
                                    variant="outline"
                                    className="gap-2 text-[var(--destructive)] border-[var(--destructive)]/30 hover:bg-[var(--destructive)]/10"
                                >
                                    {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                    Disconnect
                                </Button>
                            </div>

                            {syncResult && (
                                <div className={cn("p-4 rounded-xl border flex items-start gap-3",
                                    syncResult.success
                                        ? "bg-[var(--success)]/5 border-[var(--success)]/20"
                                        : "bg-[var(--destructive)]/5 border-[var(--destructive)]/20"
                                )}>
                                    {syncResult.success
                                        ? <CheckCircle2 className="size-5 text-[var(--success)] shrink-0 mt-0.5" />
                                        : <AlertTriangle className="size-5 text-[var(--destructive)] shrink-0 mt-0.5" />
                                    }
                                    <div>
                                        <p className={cn("text-sm font-medium", syncResult.success ? "text-[var(--success)]" : "text-[var(--destructive)]")}>
                                            {syncResult.message}
                                        </p>
                                        {syncResult.success && syncResult.imported > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {syncResult.imported} imported • {syncResult.skipped} already existed • {syncResult.total} raw fills from Dhan
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/15 flex items-start gap-3">
                                <AlertTriangle className="size-5 text-[var(--warning)] shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-[var(--warning)]">Access Token Expires Every 24 Hours</p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Dhan access tokens expire daily. If sync fails, regenerate your token from{" "}
                                        <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                                            web.dhan.co <ExternalLink className="size-3.5" />
                                        </a>{" "}
                                        → Profile → Access DhanHQ APIs, then reconnect.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Connect Form ── */
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                    <Shield className="size-4 text-cyan-400" /> How to Connect
                                </h3>
                                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                                    <li>
                                        Login to{" "}
                                        <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                                            web.dhan.co <ExternalLink className="size-3.5" />
                                        </a>
                                    </li>
                                    <li>Go to <strong>Profile → Access DhanHQ APIs</strong></li>
                                    <li>Set up TOTP if not already done</li>
                                    <li>Generate an Access Token (valid for 24 hours)</li>
                                    <li>Copy your <strong>Client ID</strong> and <strong>Access Token</strong> below</li>
                                </ol>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label-mono text-muted-foreground block mb-1.5">Dhan Client ID</label>
                                    <input
                                        type="text"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="e.g. 1100012345"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="label-mono text-muted-foreground block mb-1.5">Access Token</label>
                                    <div className="relative">
                                        <input
                                            type={showToken ? "text" : "password"}
                                            value={accessToken}
                                            onChange={(e) => setAccessToken(e.target.value)}
                                            placeholder="Paste your Dhan access token"
                                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                        <Shield className="size-3.5" /> Token is encrypted before storage — never stored in plain text
                                    </p>
                                </div>
                            </div>

                            {connectError && (
                                <div className="p-3 rounded-xl bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-[var(--destructive)] shrink-0" />
                                    <p className="text-sm text-[var(--destructive)]">{connectError}</p>
                                </div>
                            )}
                            {connectSuccess && (
                                <div className="p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20 flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-[var(--success)] shrink-0" />
                                    <p className="text-sm text-[var(--success)]">{connectSuccess}</p>
                                </div>
                            )}

                            <Button
                                onClick={() => handleConnect("dhan")}
                                disabled={connecting || !clientId.trim() || !accessToken.trim()}
                                className="bg-gradient-to-r from-cyan-600 to-[var(--primary)] hover:from-cyan-700 hover:to-[var(--primary)] text-white shadow-cyan-500/20 gap-2 w-full sm:w-auto"
                            >
                                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                {connecting ? "Verifying & Connecting..." : "Connect Dhan Account"}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <Card className="glass-card p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Good to Know
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { title: "Daily Sync Only", desc: "Dhan API only provides today's trade book. Sync daily to keep your journal up to date.", icon: Clock },
                        { title: "Intraday Pairs", desc: "BUY+SELL orders on the same symbol are automatically paired into complete trades.", icon: Zap },
                        { title: "No Duplicates", desc: "Already-imported trades are skipped automatically. Sync as often as you like.", icon: CheckCircle2 },
                    ].map((item, i) => (
                        <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                            <div className="flex items-center gap-2 mb-2">
                                <item.icon className="size-4 text-cyan-400" />
                                <p className="label-mono text-foreground">{item.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )

    /* ═══════════════════════════ SAHI DETAILS ═══════════════════════════ */
    const renderSahiDetails = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <Button
                variant="ghost"
                onClick={() => setSelectedBroker(null)}
                className="gap-2 text-muted-foreground hover:text-foreground pl-0"
            >
                <span className="p-1 rounded-md bg-muted/50"><ArrowLeft className="size-4" /></span>
                Back to Brokers
            </Button>

            <Card className="glass-card relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-[.06] bg-emerald-500" />
                <div className="relative z-10 p-6 md:p-8">
                    {/* Broker title bar */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl overflow-hidden border border-emerald-500/20 relative shadow-emerald-500/10 bg-black">
                                <Image src="/sahi_logo.png" alt="Sahi" fill className="object-cover" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Sahi</h2>
                                <p className="text-xs text-muted-foreground">Indian Stock Market Broker • Free Trade API</p>
                            </div>
                        </div>
                        {sahi ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 rounded-full border border-[var(--success)]/20">
                                <CheckCircle2 className="size-4" /> Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                                Not Connected
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                        </div>
                    ) : sahi ? (
                        /* ── Connected View ── */
                        <div className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="label-mono text-muted-foreground mb-1">API Key ID</p>
                                    <p className="text-sm font-mono text-foreground truncate" title={sahi.clientId}>{sahi.clientId}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="label-mono text-muted-foreground mb-1">Status</p>
                                    <p className="text-sm text-[var(--success)] font-medium flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" /> Active
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="label-mono text-muted-foreground mb-1">Last Synced</p>
                                    <p className="text-sm text-foreground flex items-center gap-1.5">
                                        <Clock className="size-4 text-muted-foreground" />
                                        {sahi.lastSynced
                                            ? new Date(sahi.lastSynced).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                                            : "Never"
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Sync Actions + Optional 6-digit TOTP input */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button
                                    onClick={() => handleSync("sahi")}
                                    disabled={syncing}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20 gap-2"
                                >
                                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                    {syncing ? "Syncing..." : "Sync Today's Trades"}
                                </Button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={syncTotpCode}
                                    onChange={(e) => setSyncTotpCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="6-digit TOTP (if needed)"
                                    className="w-44 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                                />
                                <Button
                                    onClick={() => handleDisconnect("sahi")}
                                    disabled={disconnecting}
                                    variant="outline"
                                    className="gap-2 text-[var(--destructive)] border-[var(--destructive)]/30 hover:bg-[var(--destructive)]/10"
                                >
                                    {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                    Disconnect
                                </Button>
                            </div>

                            {syncResult && (
                                <div className={cn("p-4 rounded-xl border flex items-start gap-3",
                                    syncResult.success
                                        ? "bg-[var(--success)]/5 border-[var(--success)]/20"
                                        : "bg-[var(--destructive)]/5 border-[var(--destructive)]/20"
                                )}>
                                    {syncResult.success
                                        ? <CheckCircle2 className="size-5 text-[var(--success)] shrink-0 mt-0.5" />
                                        : <AlertTriangle className="size-5 text-[var(--destructive)] shrink-0 mt-0.5" />
                                    }
                                    <div>
                                        <p className={cn("text-sm font-medium", syncResult.success ? "text-[var(--success)]" : "text-[var(--destructive)]")}>
                                            {syncResult.message}
                                        </p>
                                        {syncResult.success && syncResult.imported > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {syncResult.imported} imported • {syncResult.skipped} already existed • {syncResult.total} raw fills from Sahi
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-[var(--warning)]/5 border border-[var(--warning)]/15 flex items-start gap-3">
                                <AlertTriangle className="size-5 text-[var(--warning)] shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-[var(--warning)]">Daily Key Approval Resets at 6:00 AM IST</p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        For a <strong>Regular key</strong>, click <strong>Approve</strong> once each trading day in{" "}
                                        <a href="https://web.sahi.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">
                                            web.sahi.com <ExternalLink className="size-3.5" />
                                        </a>{" "}
                                        → Profile Avatar → API Dashboard — no need to reconnect here. If you connected a <strong>TOTP key</strong> with your Setup Key, Bazaar auto-approves daily; otherwise enter your 6-digit TOTP above once per day.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Connect Form ── */
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Shield className="size-4 text-emerald-400" /> How to Get Your Sahi API Credentials
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs">
                                        <a
                                            href="https://docs.sahi.com/quick-start/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                                        >
                                            Quick Start Guide <ExternalLink className="size-3.5" />
                                        </a>
                                        <a
                                            href="https://docs.sahi.com/api/v1/reference/authentication/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                                        >
                                            Auth Docs <ExternalLink className="size-3.5" />
                                        </a>
                                    </div>
                                </div>
                                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                                    <li>
                                        Login to{" "}
                                        <a href="https://web.sahi.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">
                                            web.sahi.com <ExternalLink className="size-3.5" />
                                        </a>
                                    </li>
                                    <li>Click your <strong>Profile Avatar (bottom left) → API Dashboard → Create API key</strong></li>
                                    <li>Choose <strong>Full access</strong> (required for reading your order book &amp; fills; <em>no Static IP is needed</em> for trade syncing)</li>
                                    <li>Pick <strong>Regular</strong> (1-click daily Approve) or <strong>TOTP</strong> (copy the Setup Key for hands-free auto-sync)</li>
                                    <li>Copy your <strong>API Key ID</strong> (<code className="font-mono text-foreground">pk_…</code>) and <strong>API Secret</strong> (<code className="font-mono text-foreground">sahi_sk_…</code> — shown only once!) below</li>
                                </ol>
                            </div>

                            {/* Key Type Toggle */}
                            <div>
                                <label className="label-mono text-muted-foreground block mb-1.5">Sahi API Key Type</label>
                                <div className="grid grid-cols-2 gap-2 max-w-md">
                                    <button
                                        type="button"
                                        onClick={() => setSahiKeyType("regular")}
                                        className={cn(
                                            "px-3 py-2 rounded-xl border text-left transition-all",
                                            sahiKeyType === "regular"
                                                ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                                                : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <p className="text-xs font-semibold">Regular Key</p>
                                        <p className="text-[11px] text-muted-foreground">Approve daily in Sahi Dashboard</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSahiKeyType("totp")}
                                        className={cn(
                                            "px-3 py-2 rounded-xl border text-left transition-all",
                                            sahiKeyType === "totp"
                                                ? "border-emerald-500/50 bg-emerald-500/10 text-foreground"
                                                : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <p className="text-xs font-semibold">TOTP Key</p>
                                        <p className="text-[11px] text-muted-foreground">Auto-approve via authenticator</p>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label-mono text-muted-foreground block mb-1.5">Sahi API Key ID</label>
                                    <input
                                        type="text"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="e.g. pk_d1jqhcg55l6bd0e0oq3g"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="label-mono text-muted-foreground block mb-1.5">Sahi API Secret</label>
                                    <div className="relative">
                                        <input
                                            type={showToken ? "text" : "password"}
                                            value={accessToken}
                                            onChange={(e) => setAccessToken(e.target.value)}
                                            placeholder="e.g. sahi_sk_..."
                                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                        <Shield className="size-3.5" /> Credentials are AES-256-GCM encrypted before storage — never stored in plain text
                                    </p>
                                </div>

                                {sahiKeyType === "totp" && (
                                    <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-xl bg-muted/20 border border-border/40">
                                        <div>
                                            <label className="label-mono text-muted-foreground block mb-1.5">
                                                TOTP Setup Key <span className="normal-case font-normal">(Recommended)</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showTotpSecret ? "text" : "password"}
                                                    value={sahiTotpSecret}
                                                    onChange={(e) => setSahiTotpSecret(e.target.value)}
                                                    placeholder="Base32 setup key from Sahi"
                                                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-background/60 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTotpSecret(!showTotpSecret)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showTotpSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                Encrypted &amp; stored so Bazaar generates codes automatically every day.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="label-mono text-muted-foreground block mb-1.5">
                                                Or Current 6-Digit TOTP
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={sahiTotpCode}
                                                onChange={(e) => setSahiTotpCode(e.target.value.replace(/\D/g, ""))}
                                                placeholder="e.g. 042917"
                                                className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                                            />
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                Use if you prefer entering the code from Google Authenticator daily.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {connectError && (
                                <div className="p-3 rounded-xl bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-[var(--destructive)] shrink-0" />
                                    <p className="text-sm text-[var(--destructive)]">{connectError}</p>
                                </div>
                            )}
                            {connectSuccess && (
                                <div className="p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20 flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-[var(--success)] shrink-0" />
                                    <p className="text-sm text-[var(--success)]">{connectSuccess}</p>
                                </div>
                            )}

                            <Button
                                onClick={() => handleConnect("sahi")}
                                disabled={connecting || !clientId.trim() || !accessToken.trim()}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20 gap-2 w-full sm:w-auto"
                            >
                                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                {connecting ? "Verifying & Connecting..." : "Connect Sahi Account"}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <Card className="glass-card p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Good to Know
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { title: "No Static IP Needed", desc: "Sahi only checks static IPs for placing orders. Read-only trade syncing works from anywhere.", icon: KeyRound },
                        { title: "Daily Sync Only", desc: "Sahi API provides the current trading day's orders & fills. Sync daily before 6:00 AM IST reset.", icon: Clock },
                        { title: "Auto-Paired & Deduped", desc: "Individual fills are converted from paise to ₹, FIFO-paired, and deduplicated automatically.", icon: CheckCircle2 },
                    ].map((item, i) => (
                        <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                            <div className="flex items-center gap-2 mb-2">
                                <item.icon className="size-4 text-emerald-400" />
                                <p className="label-mono text-foreground">{item.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div>
                <h1 className="font-display text-4xl leading-[1.02] tracking-tight md:text-[2.75rem] flex items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 text-foreground shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)] [&>svg]:size-5">
                        <Link2 />
                    </span>
                    Broker Connections
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">Connect your trading account to auto-import trades</p>
            </div>

            {selectedBroker === "dhan"
                ? renderDhanDetails()
                : selectedBroker === "sahi"
                    ? renderSahiDetails()
                    : renderBrokerList()}
        </div>
    )
}
