"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/utils/supabase/client"

interface User {
    id: string
    name: string
    email: string
    username?: string
    initials?: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    refreshUser: () => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                setUser(null)
                setLoading(false)
                return
            }

            const res = await fetch("/api/user", { cache: "no-store" })
            const data = await res.json()
            if (data.success && data.user) {
                setUser(data.user)
            } else {
                // Fallback to auth metadata if public profile fetch failed
                const sUser = session.user
                const name = sUser.user_metadata?.name || sUser.user_metadata?.full_name || sUser.email?.split("@")[0] || "User"
                setUser({
                    id: sUser.id,
                    name,
                    email: sUser.email || "",
                    username: sUser.user_metadata?.username || sUser.email?.split("@")[0],
                    initials: name.charAt(0).toUpperCase()
                })
            }
        } catch (error) {
            console.error("Failed to fetch user context", error)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
                fetchUser()
            } else if (event === "SIGNED_OUT") {
                setUser(null)
                setLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) {
                toast.error("Failed to logout: " + error.message)
            } else {
                setUser(null)
                window.location.href = "/sign-in"
            }
        } catch {
            toast.error("Failed to logout")
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser: fetchUser, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
