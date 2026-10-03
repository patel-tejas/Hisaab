import { createClient } from "@/utils/supabase/server";

export async function getAuthUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error("getAuthUser error:", err);
    return null;
  }
}

/**
 * The verified user plus their access token, for calls that must act as
 * that user elsewhere (the Eve engine forwards the token to Supabase, so
 * row-level security applies there too).
 *
 * `getUser()` verifies the user with Supabase; the token comes from the same
 * cookie session and is only used once that check has passed.
 */
export async function getAuthContext() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return { user, token: session?.access_token ?? null };
  } catch (err) {
    console.error("getAuthContext error:", err);
    return null;
  }
}
