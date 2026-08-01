import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PUT(req: Request) {
    try {
        const { username, name, email } = await req.json();

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        if (!username || typeof username !== "string" || username.trim().length < 3) {
            return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const trimmedUsername = username.trim();

        // Check if username is taken by another user
        const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", trimmedUsername)
            .neq("id", user.id)
            .maybeSingle();

        if (existingUser) {
            return NextResponse.json({ error: "Username already taken" }, { status: 400 });
        }

        // Update public.profiles
        const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                username: trimmedUsername,
                name,
                email,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Update auth.users email if changed
        if (email !== user.email) {
            await supabase.auth.updateUser({ email });
        }

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user.id,
                name: updatedProfile.name,
                email: updatedProfile.email,
                username: updatedProfile.username,
                initials: name ? name.charAt(0).toUpperCase() : "U",
            },
        });
    } catch (err: any) {
        console.error("Profile update error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
