import { describe, expect, test } from "bun:test";

import { FIRST_PARTY_SERVICE_USERS } from "lib/auth/serviceUsers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Arbor service-user registry guards.
 *
 * The identityProviderId is the Gatekeeper `sub` and MUST equal the id the
 * gatekeeper-app service-user seed pins for the same principal, or the two
 * services would resolve different users for one token. The value is asserted
 * literally here so a drift on either side fails a test.
 */
describe("FIRST_PARTY_SERVICE_USERS", () => {
  test("every identityProviderId is a valid UUID", () => {
    for (const def of FIRST_PARTY_SERVICE_USERS) {
      expect(def.identityProviderId).toMatch(UUID_RE);
    }
  });

  test("identityProviderIds, usernames, and emails are unique", () => {
    const subs = FIRST_PARTY_SERVICE_USERS.map((d) => d.identityProviderId);
    const usernames = FIRST_PARTY_SERVICE_USERS.map((d) => d.username);
    const emails = FIRST_PARTY_SERVICE_USERS.map((d) => d.email);
    expect(new Set(subs).size).toBe(subs.length);
    expect(new Set(usernames).size).toBe(usernames.length);
    expect(new Set(emails).size).toBe(emails.length);
  });

  test("pins the Keystone publisher to the shared Gatekeeper sub", () => {
    const keystone = FIRST_PARTY_SERVICE_USERS.find(
      (d) => d.username === "keystone",
    );
    // Must match gatekeeper-app FIRST_PARTY_SERVICE_USERS keystone-publisher.id
    expect(keystone?.identityProviderId).toBe(
      "17362f35-7ff9-44e3-9fd3-99ed4adf36d9",
    );
    expect(keystone?.email).toBe("keystone-publisher@omni.dev");
    expect(keystone?.patName).toBe("keystone-publisher");
  });
});
