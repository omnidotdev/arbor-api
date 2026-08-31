import { getApplicationStatus } from "lib/beta/applicationStatus";
import { isStaffEmail } from "lib/beta/staffEnrollment";
import { isWhitelisted } from "lib/beta/whitelist";
import { arborLaunched, betaWhitelistUserIds } from "lib/config/env.config";
import { billingBypassOrgIds } from "lib/graphql/plugins/authorization/constants";

/**
 * Resolve whether a caller may use arbor while the closed-beta gate is active.
 *
 * The shared allow/deny decision behind BOTH enforcement layers: the GraphQL
 * Envelop gate (betaGate.plugin) and the git smart-http gate
 * (gitAccess.isGitCallerBetaBlocked). It lives here in lib/beta, next to the
 * whitelist/status primitives it composes, so the git layer does not have to
 * reach into a GraphQL plugin for it and the two gates cannot drift.
 *
 * Combines the env whitelist with the internal billing-bypass org escape hatch.
 * The two cheap in-memory checks (env whitelist, bypass-org membership) run first
 * and short-circuit, so a rollout-seeded env-whitelisted user or a bypass-org
 * member never pays for the DB lookup; only the approved-application case reaches
 * getApplicationStatus. The env-whitelist ids and bypass org ids are injectable
 * so the resolution is unit-testable, defaulting to the live config.
 */
export const resolveBetaAllowed = async (
  {
    observer,
    organizations,
    db,
  }: {
    observer: { id: string; email?: string | null } | null | undefined;
    organizations: ReadonlyArray<{ id: string }>;
    db: Parameters<typeof getApplicationStatus>[0];
  },
  {
    envIds = betaWhitelistUserIds,
    bypassOrgIds = billingBypassOrgIds,
    isStaff = isStaffEmail,
    launched = arborLaunched,
  }: {
    envIds?: string[];
    bypassOrgIds?: string[];
    isStaff?: (email: string | null | undefined) => boolean;
    launched?: boolean;
  } = {},
): Promise<boolean> => {
  // pre-launch "coming soon" mode: arbor is not open yet, so ONLY the founder
  // whitelist (env user ids) may reach the app or git. Approved testers and Omni
  // staff wait until launch, even though their applications keep collecting
  if (!launched) return Boolean(observer?.id && envIds.includes(observer.id));

  // cheap in-memory check: an env-whitelisted user id
  if (observer?.id && envIds.includes(observer.id)) return true;

  // cheap in-memory check: an Omni staff email domain always passes, regardless
  // of the tester_application row state, so staff access survives a bad bifrost
  // decision later flipping their row
  if (isStaff(observer?.email)) return true;

  // cheap in-memory check: the internal-org escape hatch, a member of a
  // billing-bypass org is allowed through regardless of application status
  if (organizations.some((org) => bypassOrgIds.includes(org.id))) return true;

  // fail closed for an anonymous caller before touching the DB
  if (!observer) return false;

  // only now the DB lookup, for the approved-application case
  const applicationStatus = await getApplicationStatus(db, observer.id);
  return isWhitelisted({
    gateEnabled: true,
    userId: observer.id,
    envIds,
    applicationStatus,
  });
};
