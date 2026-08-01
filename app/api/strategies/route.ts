import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { defaultStrategies } from "@/lib/default-strategies";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: userStrats } = await supabase
            .from("strategies")
            .select("name")
            .eq("user_id", user.id);

        const customNames = (userStrats || []).map((s) => s.name);
        const combined = Array.from(new Set([...defaultStrategies, ...customNames]));

        return NextResponse.json({ strategies: combined });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, tags } = await req.json();

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Strategy name is required" }, { status: 400 });
        }

        const trimmed = name.trim();

        const { data: newStrat, error: insertError } = await supabase
            .from("strategies")
            .insert({
                user_id: user.id,
                name: trimmed,
                description: description || null,
                tags: Array.isArray(tags) ? tags : [],
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, strategy: newStrat }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
