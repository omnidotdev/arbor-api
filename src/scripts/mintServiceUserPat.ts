/**
 * @file One-shot: mint the long-lived write PAT for a first-party service user.
 *
 * ============================ OPERATOR SCRIPT ============================
 * This is NOT a boot step and is deliberately NOT wired into `start`. It mints
 * a personal access token, whose plaintext Arbor reveals exactly once and never
 * stores (only a SHA-256 hash is persisted). It prints that plaintext to stdout
 * a single time so an operator can capture it directly into the secret store.
 *
 * Running it on boot (in a pod) would write the token into container logs, which
 * is a credential leak. So an operator runs it manually, once, against the
 * target database in a controlled session, and pipes the output straight into
 * the Pulumi secret, e.g.:
 *
 *   DATABASE_URL=<prod arbor db url> \
 *     bun run src/scripts/mintServiceUserPat.ts keystone
 *   # copy the arbor_pat_... value into:
 *   #   pulumi config set --secret keystone:arbor-service-token '<token>'
 *   # and the printed local user id into ARBOR_BETA_WHITELIST_USER_IDS.
 *
 * Idempotent-ish: if a PAT with the service user's configured name already
 * exists, it does NOT mint another (the old plaintext is unrecoverable, so a
 * second mint would orphan a live credential). Rotating is a deliberate act:
 * delete the existing PAT row first, then re-run.
 * ========================================================================
 */

import { and, eq } from "drizzle-orm";

import { createPersonalAccessTokenRecord } from "lib/auth/personalAccessToken";
import { FIRST_PARTY_SERVICE_USERS } from "lib/auth/serviceUsers";
import { dbPool, pgPool } from "lib/db/db";
import { personalAccessTokenTable, userTable } from "lib/db/schema";

const run = async () => {
  const username = process.argv[2];
  if (!username) {
    console.error(
      `Usage: bun run src/scripts/mintServiceUserPat.ts <username>\n` +
        `Known service users: ${FIRST_PARTY_SERVICE_USERS.map(
          (d) => d.username,
        ).join(", ")}`,
    );
    process.exit(1);
  }

  const def = FIRST_PARTY_SERVICE_USERS.find((d) => d.username === username);
  if (!def) {
    console.error(
      `No service user "${username}". Known: ${FIRST_PARTY_SERVICE_USERS.map(
        (d) => d.username,
      ).join(", ")}`,
    );
    process.exit(1);
  }

  // The user row must already exist (seeded on boot by seedServiceUsers.ts)
  const [user] = await dbPool
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.identityProviderId, def.identityProviderId));

  if (!user) {
    console.error(
      `Service user "${username}" is not seeded yet (no row for identity_provider_id ` +
        `${def.identityProviderId}). Deploy the seed first, then re-run.`,
    );
    process.exit(1);
  }

  // Do not mint a second PAT with the same name: the prior plaintext cannot be
  // recovered, so a duplicate would orphan a live credential
  const [existing] = await dbPool
    .select({ tokenPrefix: personalAccessTokenTable.tokenPrefix })
    .from(personalAccessTokenTable)
    .where(
      and(
        eq(personalAccessTokenTable.userId, user.id),
        eq(personalAccessTokenTable.name, def.patName),
      ),
    );

  if (existing) {
    console.error(
      `A PAT named "${def.patName}" already exists for ${username} ` +
        `(prefix ${existing.tokenPrefix}...). Not minting another; its plaintext ` +
        `is unrecoverable. To rotate, delete that PAT row first, then re-run.`,
    );
    process.exit(1);
  }

  // Long-lived (no expiry) and unconfined write scope: the publisher must create
  // repos and push to any site repo it owns. Repository confinement is omitted,
  // so the token reaches everything its owning user can reach
  const payload = await createPersonalAccessTokenRecord({
    observer: { id: user.id },
    name: def.patName,
    permission: "write",
    db: dbPool,
  });

  console.info(
    [
      "",
      "================= CAPTURE NOW (shown once) =================",
      `service user : ${username} (${def.email})`,
      `local user id: ${user.id}`,
      `   -> add to ARBOR_BETA_WHITELIST_USER_IDS (arbor IaC)`,
      `PAT name     : ${payload.name}`,
      `PAT (secret) : ${payload.token}`,
      `   -> pulumi config set --secret keystone:arbor-service-token '<PAT>'`,
      "===========================================================",
      "",
    ].join("\n"),
  );

  // Close the pool so the process exits instead of hanging on an idle client
  await pgPool.end();
};

run().catch((err) => {
  console.error("[MintServiceUserPat] failed:", err);
  process.exit(1);
});
