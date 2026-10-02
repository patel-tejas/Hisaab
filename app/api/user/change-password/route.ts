import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { isDemoUser, DEMO_READ_ONLY_ERROR } from "@/lib/demo";

export async function POST(req: Request) {
    try {
        const { currentPassword, newPassword } = await req.json();

        if (typeof currentPassword !== "string" || !currentPassword) {
            return NextResponse.json({ error: "Current password is required" }, { status: 400 });
        }

        if (typeof newPassword !== "string" || !newPassword) {
            return NextResponse.json({ error: "New password is required" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
        }

        if (newPassword === currentPassword) {
            return NextResponse.json({ error: "New password must be different from the current one" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || !user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (isDemoUser(user)) {
            return NextResponse.json({ error: DEMO_READ_ONLY_ERROR }, { status: 403 });
        }

        // Re-authenticate before changing the password, so a stolen session
        // cookie alone cannot take over the account. A throwaway client is
        // used so this check does not touch the caller's session cookies.
        const verifier = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        );
        const { error: verifyError } = await verifier.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
        });
        if (verifyError) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
        }
        await verifier.auth.signOut({ scope: "local" }).catch(() => {});

        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            console.error("change-password: updateUser failed:", updateError.message);
            return NextResponse.json({ error: "Could not update password. Please try again." }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (err: any) {
        console.error("change-password error:", err?.message);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
