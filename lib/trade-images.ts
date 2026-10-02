/**
 * Trade screenshots live in the private `trades` storage bucket under
 * `<user_id>/<uuid>.<ext>`. `trade_images.image_url` stores that object path
 * (older rows store a full public URL). Browsers never get a permanent link:
 * they load `/api/trades/image?ref=…`, which checks ownership and redirects
 * to a short-lived signed URL.
 */

export const TRADE_IMAGE_BUCKET = "trades";
export const TRADE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TRADE_IMAGE_TYPES: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};

const LEGACY_PUBLIC_MARKER = `/storage/v1/object/public/${TRADE_IMAGE_BUCKET}/`;

/** Browser-loadable src for a stored image reference. */
export function tradeImageSrc(ref: string): string {
    if (ref.startsWith("blob:") || ref.startsWith("data:")) return ref;
    return `/api/trades/image?ref=${encodeURIComponent(ref)}`;
}

/** Object path inside the bucket for a stored reference, or null if it is not ours. */
export function objectPathFromRef(ref: string): string | null {
    if (!ref) return null;
    if (/^https?:\/\//.test(ref)) {
        const i = ref.indexOf(LEGACY_PUBLIC_MARKER);
        if (i === -1) return null;
        return decodeURIComponent(ref.slice(i + LEGACY_PUBLIC_MARKER.length).split("?")[0]) || null;
    }
    if (ref.includes("..") || ref.startsWith("/")) return null;
    return ref;
}

/** True when `ref` is a path inside this user's own folder. */
export function isOwnImagePath(ref: string, userId: string): boolean {
    return !ref.includes("..") && ref.startsWith(`${userId}/`) && ref.length > userId.length + 1;
}

/**
 * Keep only image references a trade may store: paths in the caller's own
 * folder, and legacy public URLs into this bucket (so editing an older trade
 * keeps its screenshots). Storage RLS still decides who can read the bytes.
 */
export function sanitizeImageRefs(images: unknown, userId: string): string[] {
    if (!Array.isArray(images)) return [];
    return images
        .filter((r): r is string => typeof r === "string")
        .filter((r) => isOwnImagePath(r, userId) || (/^https:\/\//.test(r) && objectPathFromRef(r) !== null))
        .slice(0, 20);
}
