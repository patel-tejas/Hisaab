"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, Eye, EyeOff, User } from "lucide-react"

export default function SettingsPage() {
    const { user, refreshUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Profile Edit State
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)

    // Force re-render of inputs when user data is loaded
    const inputKey = user ? `user-loaded-${user.id}-${user.name}-${user.email}` : "loading";

    const handleSubmitProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoadingProfile(true)
        setProfileMessage(null)

        const formData = new FormData(e.currentTarget)
        const username = formData.get("username")
        const name = formData.get("name")
        const email = formData.get("email")

        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, name, email }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to update profile")

            setProfileMessage({ type: "success", text: "Profile updated successfully" })
            await refreshUser()
        } catch (err: any) {
            setProfileMessage({ type: "error", text: err.message })
        } finally {
            setLoadingProfile(false)
        }
    }

    const handleSubmitPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        const currentPassword = formData.get("currentPassword")
        const newPassword = formData.get("newPassword")
        const confirmPassword = formData.get("confirmPassword")

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "New passwords do not match" })
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/user/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to update password")

            setMessage({ type: "success", text: "Password updated successfully" })
            e.currentTarget.reset()
        } catch (err: any) {
            setMessage({ type: "error", text: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto py-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="font-display text-3xl tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Settings
                </h1>
            </div>

            <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Profile Details
                    </CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmitProfile} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                key={`username-${inputKey}`}
                                id="username"
                                name="username"
                                defaultValue={user?.username || ""}
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                key={`name-${inputKey}`}
                                id="name"
                                name="name"
                                defaultValue={user?.name || ""}
                                placeholder="Enter your name"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                key={`email-${inputKey}`}
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={user?.email || ""}
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        {profileMessage && (
                            <div className={`p-3 rounded-lg text-sm font-medium ${profileMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                {profileMessage.text}
                            </div>
                        )}

                        <Button type="submit" disabled={loadingProfile} variant="outline" className="w-full">
                            {loadingProfile ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Profile"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Security
                    </CardTitle>
                    <CardDescription>Update your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmitPassword} className="space-y-4">
                        <div className="grid gap-2 relative">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    name="currentPassword"
                                    type={showCurrent ? "text" : "password"}
                                    required
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type={showNew ? "text" : "password"}
                                    required
                                    minLength={6}
                                    placeholder="Enter new password (min. 6 chars)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showNew ? "text" : "password"}
                                required
                                minLength={6}
                                placeholder="Confirm new password"
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                {message.text}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition-all duration-300">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Change Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
