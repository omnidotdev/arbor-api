import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify an HMAC-SHA256 hex signature over a raw payload, timing-safely.
 *
 * The shared verifier for signed webhook deliveries (Vortex, IDP, entitlements):
 * computes the expected hex HMAC-SHA256 of the exact payload bytes keyed by the
 * shared secret and compares it constant-time. A length mismatch or any
 * malformed input (e.g. a non-hex signature) verifies false rather than throwing.
 */
const verifyHmacSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

export default verifyHmacSignature;
