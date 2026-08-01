import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/* ── GET: Broker connection status ── */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: connections, error } = await supabase
            .from("broker_connections")
            .select("broker, client_id, is_active, last_synced")
            .eq("user_id", user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const brokers = (connections || []).map((c: any) => ({
            broker: c.broker,
            clientId: c.client_id,
            isActive: c.is_active,
            lastSynced: c.last_synced,
        }));

        return NextResponse.json({ brokers });
    } catch (err: any) {
        console.error("Error in GET /api/broker/status:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
