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
