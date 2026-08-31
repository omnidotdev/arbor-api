import { AUTH_BASE_URL, STATS_SERVICE_KEY } from "lib/config/env.config";

/**
 * Fleet-wide Omni userbase count, read from Gatekeeper.
 *
 * Gatekeeper is the fleet's single identity provider, so its account count is
 * the fleet-wide Omni userbase total. Read from Gatekeeper's count-only
 * /api/stats endpoint (service-key authed, no PII), cached briefly. Best-effort:
 * any failure (including STATS_SERVICE_KEY or AUTH_BASE_URL being unset) returns
 * null rather than throwing, so callers can fall back to the local count
 */

const STATS_PATH = "/api/stats";
const CACHE_TTL_MS = 30_000;

let cache: { at: number; value: number | null } | null = null;

/**
 * Read the fleet-wide Omni userbase count from Gatekeeper, cached for a short
 * TTL. Returns null (never throws) when unconfigured or the read fails
 */
export const getOmniUserbase = async (
  now: number = Date.now(),
): Promise<number | null> => {
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  if (!(STATS_SERVICE_KEY && AUTH_BASE_URL)) {
    cache = { at: now, value: null };
    return null;
  }

  try {
    const response = await fetch(`${AUTH_BASE_URL}${STATS_PATH}`, {
      headers: { Authorization: `Bearer ${STATS_SERVICE_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) throw new Error(`Gatekeeper stats ${response.status}`);

    const body = (await response.json()) as { users?: number };
    const value = typeof body.users === "number" ? body.users : null;
    cache = { at: now, value };
    return value;
  } catch (err) {
    console.warn(
      "[OmniUserbase] Gatekeeper stats read failed:",
      (err as Error).message,
    );
    cache = { at: now, value: null };
    return null;
  }
};
