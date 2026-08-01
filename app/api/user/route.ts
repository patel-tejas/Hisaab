import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user profile from public.profiles table
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        const name = profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        const email = user.email || profile?.email || "";
        const username = profile?.username || user.user_metadata?.username || user.email?.split("@")[0];

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name,
                email,
                username,
                initials: name ? name.charAt(0).toUpperCase() : "U",
            },
        });
    } catch (err: any) {
        console.error("Fetch user error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}