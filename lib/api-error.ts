import { NextResponse } from "next/server";

/**
 * Log the real error server-side and return a generic message to the client.
 * Raw Supabase / Postgres messages name tables, columns and constraints, so
 * they never go back in a response body.
 */
export function apiError(context: string, err: unknown, status = 500) {
    const e = err as { message?: string; code?: string } | null;
    console.error(`[${context}]`, e?.code ?? "", e?.message ?? err);
    if (e?.code === "23505") {
        return NextResponse.json({ error: "That already exists." }, { status: 409 });
    }
    const message =
        status >= 500
            ? "Something went wrong. Please try again."
            : "The request could not be completed. Please check your input and try again.";
    return NextResponse.json({ error: message }, { status });
}
