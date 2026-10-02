import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { demoEmail } from "@/lib/demo";

/* POST: sign the visitor in as the shared demo account. The session cookies
   are set server-side, so the demo password never reaches the browser. */
export async function POST() {
    const email = demoEmail();
    const password = process.env.HISAAB_DEMO_PASSWORD;
    if (!email || !password) {
        return NextResponse.json({ error: "The demo is not available right now." }, { status: 404 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        console.error("demo sign-in failed:", error.message);
        return NextResponse.json({ error: "The demo is not available right now." }, { status: 503 });
    }

    return NextResponse.json({ success: true });
}
