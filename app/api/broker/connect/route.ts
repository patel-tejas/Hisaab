import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { encrypt } from "@/lib/encryption";
import {
    verifySahiCredentials,
    serializeSahiCredentials,
    SahiApiError,
} from "@/lib/brokers/sahi";

const SUPPORTED_BROKERS = new Set(["dhan", "sahi"]);

/* ── POST: Save / Update broker connection ── */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { broker, clientId, accessToken, totp, totpSecret } = await req.json();

        if (!broker || !clientId || !accessToken) {
            return NextResponse.json(
                { error: "Broker credentials are required" },
                { status: 400 }
            );
        }

        if (!SUPPORTED_BROKERS.has(broker)) {
            return NextResponse.json(
                { error: "Only 'dhan' and 'sahi' brokers are supported currently" },
                { status: 400 }
            );
        }

        const trimmedClientId = String(clientId).trim();
        const trimmedSecret = String(accessToken).trim();
        let encryptedToken: string;

        if (broker === "dhan") {
            // Verify Dhan token before saving
            const testRes = await fetch("https://api.dhan.co/v2/trades", {
                headers: {
                    "Content-Type": "application/json",
                    "access-token": trimmedSecret,
                },
            });

            if (!testRes.ok) {
                return NextResponse.json(
                    { error: "Invalid Dhan credentials. Make sure your access token is valid and not expired." },
                    { status: 400 }
                );
            }

            encryptedToken = encrypt(trimmedSecret);
        } else {
            // Sahi: clientId = key_id (pk_...), accessToken = secret (sahi_sk_...)
            try {
                const verified = await verifySahiCredentials({
                    keyId: trimmedClientId,
                    secret: trimmedSecret,
                    totp: typeof totp === "string" ? totp : undefined,
                    totpSecret: typeof totpSecret === "string" ? totpSecret : undefined,
                });

                const serialized = serializeSahiCredentials({
                    secret: trimmedSecret,
                    ...(typeof totpSecret === "string" && totpSecret.trim()
                        ? { totpSecret: totpSecret.trim() }
                        : {}),
                    cachedToken: verified.accessToken,
                    tokenExpiresAt: verified.expiresAt,
                });

                encryptedToken = encrypt(serialized);
            } catch (err: any) {
                const status = err instanceof SahiApiError && err.status >= 400 && err.status < 500 ? 400 : 500;
                return NextResponse.json(
                    { error: err?.message || "Failed to verify Sahi API credentials." },
                    { status }
                );
            }
        }

        // Upsert into broker_connections table
        const { error: upsertError } = await supabase
            .from("broker_connections")
            .upsert(
                {
                    user_id: user.id,
                    broker,
                    client_id: trimmedClientId,
                    access_token: encryptedToken,
                    is_active: true,
                },
                { onConflict: "user_id,broker" }
            );

        if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        const label = broker === "sahi" ? "Sahi" : "Dhan";
        return NextResponse.json({ success: true, message: `${label} broker connected successfully` });
    } catch (err: any) {
        console.error("Broker connect error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
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
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Broker disconnected" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
