"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import {
    Link2, Unlink, RefreshCw, Shield, Clock, CheckCircle2,
    AlertTriangle, ExternalLink, Loader2, Eye, EyeOff, Zap,
} from "lucide-react"
import Image from "next/image"

/* ──────────────── Types ──────────────── */
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

/* ════════════════════════════════════════════════════════════════════
   BROKER SETTINGS PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function BrokerPage() {
    const [brokers, setBrokers] = useState<BrokerStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
    const [selectedBroker, setSelectedBroker] = useState<string | null>(null)

    // Dhan form
    const [clientId, setClientId] = useState("")
    const [accessToken, setAccessToken] = useState("")
    const [showToken, setShowToken] = useState(false)
    const [connectError, setConnectError] = useState("")
    const [connectSuccess, setConnectSuccess] = useState("")

    const dhan = brokers.find((b) => b.broker === "dhan")

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
    const handleConnect = async () => {
        if (!clientId.trim() || !accessToken.trim()) {
            setConnectError("Both Client ID and Access Token are required")
            return
        }
        setConnecting(true)
        setConnectError("")
        setConnectSuccess("")
        try {
            const res = await fetch("/api/broker/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ broker: "dhan", clientId: clientId.trim(), accessToken: accessToken.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setConnectSuccess("Dhan connected successfully!")
            setClientId("")
            setAccessToken("")
            fetchStatus()
        } catch (err: any) {
            setConnectError(err.message)
        } finally { setConnecting(false) }
    }

    /* ── Disconnect ── */
    const handleDisconnect = async () => {
        setDisconnecting(true)
        try {
            const res = await fetch("/api/broker/connect", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ broker: "dhan" }),
            })
            if (res.ok) {
                fetchStatus()
                setConnectSuccess("")
                setSyncResult(null)
            }
        } catch { }
        finally { setDisconnecting(false) }
    }

    /* ── Sync ── */
    const handleSync = async () => {
        setSyncing(true)
        setSyncResult(null)
        try {
            const res = await fetch("/api/broker/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ broker: "dhan" }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSyncResult(data)
            fetchStatus()
        } catch (err: any) {
            setSyncResult({ success: false, imported: 0, skipped: 0, message: err.message })
        } finally { setSyncing(false) }
    }

    /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
    const renderBrokerList = () => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Dhan Card */}
            <Card
                onClick={() => setSelectedBroker("dhan")}
                className="group relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-cyan-500/20 hover:border-cyan-500/40"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-cyan-500/20 relative shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-transform">
                        <Image src="/dhan_logo.jpg" alt="Dhan" fill className="object-cover" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Dhan</h3>
                        <p className="text-xs text-muted-foreground">Indian Stock Market</p>
                    </div>
                    {dhan ? (
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="h-5 w-5" /> Connected
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
                            <Link2 className="h-5 w-5" /> Connect Now
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
                        <div className="px-3 py-1.5 rounded-full bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                            Integration Soon
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )

    const renderDhanDetails = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <Button
                variant="ghost"
                onClick={() => setSelectedBroker(null)}
                className="gap-2 text-muted-foreground hover:text-foreground pl-0"
            >
                <div className="p-1 rounded-md bg-muted/50"><Link2 className="h-5 w-5 rotate-180" /></div>
                Back to Brokers
            </Button>

            <Card className="glass-card relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-[.06] bg-cyan-500" />
                <div className="relative z-10 p-6 md:p-8">
                    {/* Broker title bar */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl overflow-hidden border border-cyan-500/20 relative shadow-lg shadow-cyan-500/10">
                                <Image src="/dhan_logo.jpg" alt="Dhan" fill className="object-cover" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Dhan</h2>
                                <p className="text-xs text-muted-foreground">Indian Stock Market Broker</p>
                            </div>
                        </div>
                        {dhan ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="h-5 w-5" /> Connected
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
                            {/* Status Info */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Client ID</p>
                                    <p className="text-sm font-mono text-foreground">{dhan.clientId}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</p>
                                    <p className="text-sm text-emerald-400 font-medium flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Last Synced</p>
                                    <p className="text-sm text-foreground flex items-center gap-1.5">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        {dhan.lastSynced
                                            ? new Date(dhan.lastSynced).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                                            : "Never"
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Sync Button */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 gap-2"
                                >
                                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                    {syncing ? "Syncing..." : "Sync Today's Trades"}
                                </Button>
                                <Button
                                    onClick={handleDisconnect}
                                    disabled={disconnecting}
                                    variant="outline"
                                    className="gap-2 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                                >
                                    {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                    Disconnect
                                </Button>
                            </div>

                            {/* Sync Result */}
                            {syncResult && (
                                <div className={cn(
                                    "p-4 rounded-xl border flex items-start gap-3",
                                    syncResult.success
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-rose-500/5 border-rose-500/20"
                                )}>
                                    {syncResult.success
                                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                        : <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                                    }
                                    <div>
                                        <p className={cn("text-sm font-medium", syncResult.success ? "text-emerald-400" : "text-rose-400")}>
                                            {syncResult.message}
                                        </p>
                                        {syncResult.success && syncResult.imported > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {syncResult.imported} imported • {syncResult.skipped} already existed • {syncResult.total} raw trades from Dhan
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Token Expiry Warning */}
                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-400">Access Token Expires Every 24 Hours</p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Dhan access tokens expire daily. If sync fails, regenerate your token from{" "}
                                        <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                                            web.dhan.co <ExternalLink className="h-5 w-5" />
                                        </a>{" "}
                                        → Profile → Access DhanHQ APIs, then reconnect below.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Connect Form ── */
                        <div className="space-y-5">
                            {/* Instructions */}
                            <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-cyan-400" /> How to Connect
                                </h3>
                                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                                    <li>
                                        Login to{" "}
                                        <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                                            web.dhan.co <ExternalLink className="h-5 w-5" />
                                        </a>
                                    </li>
                                    <li>Go to <strong>Profile → Access DhanHQ APIs</strong></li>
                                    <li>Set up TOTP if not already done</li>
                                    <li>Generate an Access Token (valid for 24 hours)</li>
                                    <li>Copy your <strong>Client ID</strong> and <strong>Access Token</strong> below</li>
                                </ol>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Dhan Client ID</label>
                                    <input
                                        type="text"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="e.g. 1100012345"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Access Token</label>
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
                                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                        <Shield className="h-5 w-5" /> Token is encrypted before storage — never stored in plain text
                                    </p>
                                </div>
                            </div>

                            {/* Error / Success */}
                            {connectError && (
                                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                                    <p className="text-sm text-rose-400">{connectError}</p>
                                </div>
                            )}
                            {connectSuccess && (
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                                    <p className="text-sm text-emerald-400">{connectSuccess}</p>
                                </div>
                            )}

                            {/* Connect Button */}
                            <Button
                                onClick={handleConnect}
                                disabled={connecting || !clientId.trim() || !accessToken.trim()}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 gap-2 w-full sm:w-auto"
                            >
                                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                {connecting ? "Verifying & Connecting..." : "Connect Dhan Account"}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* ──── Info Card ──── */}
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
                                <item.icon className="h-5 w-5 text-cyan-400" />
                                <p className="text-xs font-bold text-foreground uppercase tracking-wider">{item.title}</p>
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
                <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-1 flex items-center gap-3">
                    <Link2 className="h-8 w-8 text-cyan-400" /> Broker Connections
                </h1>
                <p className="text-sm text-muted-foreground">Connect your trading account to auto-import trades</p>
            </div>

            {selectedBroker === "dhan" ? renderDhanDetails() : renderBrokerList()}
        </div>
    )
}
