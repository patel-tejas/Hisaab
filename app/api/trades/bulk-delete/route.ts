import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { apiError } from "@/lib/api-error";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ids } = await req.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No trade IDs provided" }, { status: 400 });
        }

        const { error: deleteError } = await supabase
            .from("trades")
            .delete()
            .in("id", ids)
            .eq("user_id", user.id);

        if (deleteError) {
            return apiError("trades/bulk-delete", deleteError, 400);
        }

        return NextResponse.json({ success: true, count: ids.length });
    } catch (err: any) {
        return apiError("trades/bulk-delete", err, 500);
    }
}
