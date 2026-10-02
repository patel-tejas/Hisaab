import crypto from "crypto";

/**
 * Broker-token encryption (AES-256-GCM).
 *
 * v2 format:  v2:<keyId>:<salt>:<iv>:<tag>:<ciphertext>   (all hex)
 *   - The AES key is derived per value with HKDF-SHA256 from the secret in
 *     BROKER_ENCRYPTION_KEY and a random 16-byte salt.
 *   - keyId is a short fingerprint of the secret, so rotation works by moving
 *     the old secret to BROKER_ENCRYPTION_KEY_PREVIOUS: old values still
 *     decrypt, and `needsReencrypt` tells callers to rewrite them.
 *
 * Legacy format:  <iv>:<tag>:<ciphertext>, keyed by a bare SHA-256 of the
 * secret. Still readable; never written.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const LEGACY_IV_LENGTH = 16;
const SALT_LENGTH = 16;
const HKDF_INFO = Buffer.from("hisaab/broker-token/v2");

type Secret = { id: string; secret: string };

function fingerprint(secret: string): string {
    return crypto.createHash("sha256").update(`hisaab-key-id:${secret}`).digest("hex").slice(0, 8);
}

function secrets(): Secret[] {
    const current = process.env.BROKER_ENCRYPTION_KEY;
    if (!current) throw new Error("BROKER_ENCRYPTION_KEY env variable is not set");
    const list: Secret[] = [{ id: fingerprint(current), secret: current }];
    const previous = process.env.BROKER_ENCRYPTION_KEY_PREVIOUS;
    if (previous && previous !== current) list.push({ id: fingerprint(previous), secret: previous });
    return list;
}

function deriveKey(secret: string, salt: Buffer): Buffer {
    return Buffer.from(crypto.hkdfSync("sha256", secret, salt, HKDF_INFO, 32));
}

export function encrypt(text: string): string {
    const { id, secret } = secrets()[0];
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(secret, salt), iv);
    const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ["v2", id, salt.toString("hex"), iv.toString("hex"), tag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decrypt(encrypted: string): string {
    const parts = encrypted.split(":");

    if (parts[0] === "v2" && parts.length === 6) {
        const [, keyId, saltHex, ivHex, tagHex, ctHex] = parts;
        const match = secrets().find((s) => s.id === keyId);
        if (!match) throw new Error("No encryption key matches this value");
        const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(match.secret, Buffer.from(saltHex, "hex")), Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));
        return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
    }

    if (parts.length === 3) {
        const [ivHex, tagHex, ctHex] = parts;
        if (Buffer.from(ivHex, "hex").length !== LEGACY_IV_LENGTH) throw new Error("Invalid encrypted format");
        let lastError: unknown;
        for (const { secret } of secrets()) {
            try {
                const key = crypto.createHash("sha256").update(secret).digest();
                const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
                decipher.setAuthTag(Buffer.from(tagHex, "hex"));
                return decipher.update(ctHex, "hex", "utf8") + decipher.final("utf8");
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    }

    throw new Error("Invalid encrypted format");
}

/** True when a stored value should be rewritten with the current key and format. */
export function needsReencrypt(encrypted: string): boolean {
    const parts = encrypted.split(":");
    return !(parts[0] === "v2" && parts.length === 6 && parts[1] === secrets()[0].id);
}
