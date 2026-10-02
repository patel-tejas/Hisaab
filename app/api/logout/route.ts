import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/* POST: end the Supabase session (clears the auth cookies) and drop the
   legacy `Hisaab_token` cookie left by the pre-Supabase auth. */
export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);

    const response = NextResponse.json(
      { success: !error, message: error ? "Failed to logout" : "Logged out successfully" },
      { status: error ? 500 : 200 }
    );
    response.cookies.set({ name: "Hisaab_token", value: "", expires: new Date(0), path: "/" });
    return response;
  } catch (error) {
    console.error("Logout error:", (error as Error)?.message);
    return NextResponse.json({ success: false, error: "Failed to logout" }, { status: 500 });
  }
}
