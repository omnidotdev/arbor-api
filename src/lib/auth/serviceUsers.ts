/**
 * Declarative definition of a first-party SERVICE USER.
 *
 * A service user is a non-interactive Omni principal (a bot account) that an
 * Omni product authenticates AS when it acts against Arbor on behalf of its own
 * users. Arbor is user-centric (repositories have `ownerId -> user`, and callers
 * authenticate AS a user), so a product that owns repos on its users' behalf
 * needs a real `user` row, not an M2M client-credentials token (which carries no
 * user and is rejected by `resolveUserFromToken`).
 *
 * The user's identity originates in Gatekeeper: `identityProviderId` is the
 * Gatekeeper `sub` (pinned to a checked-in literal, mirroring the Gatekeeper
 * service-user seed), so the same principal is recognised across both services.
 * The LOCAL `user.id` is still DB-generated (random) and is NOT this value: it
 * is what the beta gate, RLS, and PAT ownership key on, so it must be read back
 * after the seed runs (the seed logs it).
 */
export interface ServiceUserDef {
  /**
   * The Gatekeeper `sub` for this principal, stored as `user.identity_provider_id`
   * (unique). Pinned to a literal so the row is reproducible across a rebuilt
   * database and matches the Gatekeeper seed. This is NOT the local `user.id`.
   */
  identityProviderId: string;
  /** Unique Arbor handle (the `user.username` column). */
  username: string;
  /** Display name (the `user.name` column). */
  name: string;
  /** Unique email (the `user.email` column). */
  email: string;
  /**
   * Label for the long-lived write PAT this principal uses. Used by the one-shot
   * mint script (`scripts/mintServiceUserPat.ts`) as the idempotency key: a PAT
   * with this name is minted at most once per user.
   */
  patName: string;
}

/**
 * Every first-party Arbor service user. The boot seed
 * (`scripts/db/seedServiceUsers.ts`) upserts these rows on a fresh or rebuilt
 * database; the PAT each one uses is minted out-of-band (see
 * `scripts/mintServiceUserPat.ts`). Add new service users here.
 */
export const FIRST_PARTY_SERVICE_USERS: ServiceUserDef[] = [
  {
    // Keystone's hosted-publish principal. Keystone creates, owns, and pushes
    // every published site repo AS this account, so end users never need their
    // own Arbor access. The identityProviderId is the Gatekeeper sub the
    // gatekeeper-app service-user seed pins for keystone-publisher@omni.dev
    identityProviderId: "17362f35-7ff9-44e3-9fd3-99ed4adf36d9",
    username: "keystone",
    name: "Keystone Publisher",
    email: "keystone-publisher@omni.dev",
    patName: "keystone-publisher",
  },
];
