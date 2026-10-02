import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { TRADE_IMAGE_BUCKET, isOwnImagePath, objectPathFromRef } from "@/lib/trade-images";

const SIGNED_URL_TTL_SECONDS = 300;

/* GET /api/trades/image?ref=<stored image reference>
   Redirects the owner to a short-lived signed URL for a trade screenshot. */
export async function GET(req: Request) {
    const ref = new URL(req.url).searchParams.get("ref") ?? "";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const path = objectPathFromRef(ref);
    if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // New uploads are under the user's folder. Anything else must be attached
    // to one of the user's own trades (RLS on trade_images scopes this query).
    if (!isOwnImagePath(path, user.id)) {
        const { data: owned } = await supabase
            .from("trade_images")
            .select("id")
            .eq("image_url", ref)
            .limit(1);
        if (!owned?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase.storage
        .from(TRADE_IMAGE_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const res = NextResponse.redirect(data.signedUrl, 302);
    res.headers.set("Cache-Control", `private, max-age=${SIGNED_URL_TTL_SECONDS - 30}`);
    return res;
}
