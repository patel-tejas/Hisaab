import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { encrypt } from "@/lib/encryption";
import { isDemoUser, DEMO_READ_ONLY_ERROR } from "@/lib/demo";
import { apiError } from "@/lib/api-error";

/* ── POST: Save / Update broker connection ── */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (isDemoUser(user)) {
            return NextResponse.json({ error: DEMO_READ_ONLY_ERROR }, { status: 403 });
        }

        const { broker, clientId, accessToken } = await req.json();

        if (!broker || !clientId || !accessToken) {
            return NextResponse.json({ error: "broker, clientId, and accessToken are required" }, { status: 400 });
        }

        if (broker !== "dhan") {
            return NextResponse.json({ error: "Only 'dhan' broker is supported currently" }, { status: 400 });
        }

        // Verify the token works before saving
        const testRes = await fetch("https://api.dhan.co/v2/trades", {
            headers: { "Content-Type": "application/json", "access-token": accessToken },
        });

        if (!testRes.ok) {
            return NextResponse.json(
                { error: "Invalid Dhan credentials. Make sure your access token is valid and not expired." },
                { status: 400 }
            );
        }

        const encryptedToken = encrypt(accessToken);

        // Upsert into broker_connections table
        const { error: upsertError } = await supabase
            .from("broker_connections")
            .upsert(
                {
                    user_id: user.id,
                    broker,
                    client_id: clientId,
                    access_token: encryptedToken,
                    is_active: true,
                },
                { onConflict: "user_id,broker" }
            );

        if (upsertError) {
            return apiError("broker/connect", upsertError, 500);
        }

        return NextResponse.json({ success: true, message: "Dhan broker connected successfully" });
    } catch (err: any) {
        console.error("Broker connect error:", err);
        return apiError("broker/connect", err, 500);
    }
}

/* ── DELETE: Remove broker connection ── */
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { broker } = await req.json();

        const { error: deleteError } = await supabase
            .from("broker_connections")
            .delete()
            .eq("user_id", user.id)
            .eq("broker", broker);

        if (deleteError) {
            return apiError("broker/connect", deleteError, 500);
        }

        return NextResponse.json({ success: true, message: "Broker disconnected" });
    } catch (err: any) {
        return apiError("broker/connect", err, 500);
    }
}
