/**
 * The shared demo account. Its credentials live only in server env
 * (HISAAB_DEMO_EMAIL / HISAAB_DEMO_PASSWORD), never in the client bundle.
 * Anyone can sign in as the demo user, so anything that would let one visitor
 * affect the next (attaching a broker token, changing the password or
 * profile) is refused for it.
 */
export function demoEmail(): string | null {
    const email = process.env.HISAAB_DEMO_EMAIL?.trim().toLowerCase();
    return email ? email : null;
}

export function isDemoUser(user: { email?: string | null } | null | undefined): boolean {
    const demo = demoEmail();
    return !!demo && !!user?.email && user.email.toLowerCase() === demo;
}

export const DEMO_READ_ONLY_ERROR = "This is disabled on the shared demo account. Create a free account to use it.";
