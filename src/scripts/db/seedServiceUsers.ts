/**
 * @file Reproducible, idempotent seed of first-party service users.
 *
 * Upserts the `user` rows for Arbor service users (see `lib/auth/serviceUsers`)
 * on a fresh or rebuilt database. Run as a post-migrate boot step, before the
 * server serves, so a service principal (e.g. Keystone's publisher) survives a
 * database rebuild instead of silently disappearing.
 *
 * Safe for production and safe to re-run:
 *  - Insert-if-missing keyed on the unique `identity_provider_id` (the
 *    Gatekeeper sub); never touches an existing row or any PAT minted for it.
 *    Steady state is a no-op.
 *  - Mints NO credential: the long-lived write PAT each principal uses is minted
 *    out-of-band by `scripts/mintServiceUserPat.ts` (a one-shot operator step),
 *    so no secret is ever written to a pod log by this boot seed.
 *  - Fail-safe: any error is logged and swallowed, so a problem here can never
 *    block the server from starting.
 *
 * It logs each principal's LOCAL `user.id` (a non-secret identifier). That id,
 * not the Gatekeeper sub, is what the Arbor beta gate
 * (`ARBOR_BETA_WHITELIST_USER_IDS`), RLS, and PAT ownership key on, so an
 * operator reads it from the boot log to admit the principal.
 */

import { eq } from "drizzle-orm";

import { FIRST_PARTY_SERVICE_USERS } from "lib/auth/serviceUsers";
import { dbPool } from "lib/db/db";
import { userTable } from "lib/db/schema";

const run = async () => {
  for (const def of FIRST_PARTY_SERVICE_USERS) {
    const [inserted] = await dbPool
      .insert(userTable)
      .values({
        identityProviderId: def.identityProviderId,
        username: def.username,
        name: def.name,
        email: def.email,
      })
      .onConflictDoNothing({ target: userTable.identityProviderId })
      .returning({ id: userTable.id });

    // On conflict the insert returns nothing, so read the existing row's local
    // id to log it either way
    let localId = inserted?.id;
    if (!localId) {
      const [existing] = await dbPool
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.identityProviderId, def.identityProviderId));
      localId = existing?.id;
    }

    console.info(
      `[SeedServiceUsers] ${def.username} (${def.email}) ${
        inserted ? "created" : "already present"
      }; local user id: ${localId ?? "unknown"}`,
    );
  }
};

// Never fail the boot chain over the service-user seed
run().catch((err) => {
  console.error("[SeedServiceUsers] error (continuing):", err);
});
