import { afterEach, beforeEach, expect, it } from "bun:test";

import { eq, inArray } from "drizzle-orm";

import { dbPool } from "lib/db/db";
import { organizationTable } from "lib/db/schema";
import idpWebhook from "./webhooks";

// Scoping test for the organization.deleted handler: it must soft-delete only
// the deleted org's row (matched by idpOrganizationId) and never touch another
// org. IDP_WEBHOOK_SECRET is unset in tests, so the receiver accepts the
// unsigned post.
const TARGET = "idp-test-org-deleted-target";
const CONTROL = "idp-test-org-deleted-control";

const post = (organizationId: string) =>
  idpWebhook.handle(
    new Request("http://localhost/idp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "organization.deleted",
        organizationId,
        deletedAt: "2026-08-18T00:00:00.000Z",
        timestamp: "2026-08-18T00:00:00.000Z",
      }),
    }),
  );

const cleanup = () =>
  dbPool
    .delete(organizationTable)
    .where(inArray(organizationTable.idpOrganizationId, [TARGET, CONTROL]));

beforeEach(async () => {
  await cleanup();
  await dbPool
    .insert(organizationTable)
    .values([{ idpOrganizationId: TARGET }, { idpOrganizationId: CONTROL }]);
});

afterEach(cleanup);

const read = (idpOrganizationId: string) =>
  dbPool.query.organizationTable.findFirst({
    where: eq(organizationTable.idpOrganizationId, idpOrganizationId),
  });

it("soft-deletes the target org and leaves other orgs untouched", async () => {
  const res = await post(TARGET);
  expect(res.status).toBe(200);

  const target = await read(TARGET);
  const control = await read(CONTROL);

  expect(target?.deletedAt).not.toBeNull();
  expect(target?.deletionReason).toBe("IDP organization deleted");
  // The other org must be entirely unaffected
  expect(control?.deletedAt).toBeNull();
});

it("no-ops (200) for an org that does not exist locally", async () => {
  const res = await post("idp-test-org-deleted-absent");
  expect(res.status).toBe(200);
});
