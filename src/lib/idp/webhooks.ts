/**
 * IDP (Identity Provider) webhook handler.
 *
 * Receives organization and user lifecycle events from Gatekeeper.
 * Handles cleanup of app data when organizations or users are deleted.
 *
 * Note: Member management is handled by Gatekeeper.
 * Arbor only needs to handle deletion events for data cleanup.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { IDP_WEBHOOK_SECRET } from "lib/config/env.config";
import { dbPool } from "lib/db/db";
import { organizationTable, userTable } from "lib/db/schema";

interface OrganizationDeletedPayload {
  eventType: "organization.deleted";
  organizationId: string;
  deletedAt: string;
  timestamp: string;
}

interface UserDeletedPayload {
  eventType: "user.deleted";
  userId: string;
  deletedAt: string;
  timestamp: string;
}

type IdpWebhookPayload = OrganizationDeletedPayload | UserDeletedPayload;

/**
 * Verify HMAC-SHA256 signature from IDP.
 */
const verifySignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

/**
 * IDP webhook receiver.
 * Receives organization and user lifecycle events from the identity provider.
 */
const idpWebhook = new Elysia().post(
  "/idp",
  async ({ request, headers, set }) => {
    const signature = headers["x-idp-signature"];
    const eventType = headers["x-idp-event"];

    if (!IDP_WEBHOOK_SECRET) {
      console.warn(
        "IDP_WEBHOOK_SECRET not set - skipping signature verification",
      );
    }

    try {
      const rawBody = await request.text();

      // Verify signature if secret is configured
      if (IDP_WEBHOOK_SECRET && signature) {
        const isValid = verifySignature(rawBody, signature, IDP_WEBHOOK_SECRET);

        if (!isValid) {
          set.status = 401;
          return { error: "Invalid signature" };
        }
      } else if (IDP_WEBHOOK_SECRET && !signature) {
        set.status = 401;
        return { error: "Missing signature" };
      }

      const body = JSON.parse(rawBody) as IdpWebhookPayload;

      console.log(
        `[IDP Webhook] ${body.eventType}${
          "organizationId" in body ? ` for org ${body.organizationId}` : ""
        }${body.eventType === "user.deleted" ? ` for user ${body.userId}` : ""}`,
      );

      switch (body.eventType) {
        case "organization.deleted":
          await handleOrganizationDeleted(body);
          break;
        case "user.deleted":
          await handleUserDeleted(body);
          break;
        default:
          console.warn(`[IDP Webhook] Unknown event type: ${eventType}`);
      }

      set.status = 200;
      return { received: true };
    } catch (err) {
      console.error("[IDP Webhook] Error processing webhook:", err);
      set.status = 500;
      return { error: "Internal Server Error" };
    }
  },
  {
    headers: t.Object({
      "x-idp-signature": t.Optional(t.String()),
      "x-idp-event": t.Optional(t.String()),
    }),
  },
);

/**
 * Handle organization deleted event.
 * Soft-deletes the organization record. Cascading deletes will clean up repositories.
 */
async function handleOrganizationDeleted(
  payload: OrganizationDeletedPayload,
): Promise<void> {
  const { organizationId, deletedAt } = payload;

  try {
    // Soft-delete the organization by idpOrganizationId
    const result = await dbPool
      .update(organizationTable)
      .set({
        deletedAt: new Date(deletedAt),
        deletionReason: "IDP organization deleted",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(organizationTable.idpOrganizationId, organizationId))
      .returning({ id: organizationTable.id });

    if (result.length > 0) {
      console.log(
        `[IDP Webhook] Soft-deleted organization ${result[0].id} (IDP org ${organizationId})`,
      );
    } else {
      console.log(
        `[IDP Webhook] No local organization found for IDP org ${organizationId} (may not exist in Arbor)`,
      );
    }
  } catch (err) {
    console.error(
      `[IDP Webhook] Failed to soft-delete organization ${organizationId}:`,
      err,
    );
    throw err;
  }
}

/**
 * Handle user deleted event.
 * Deletes the local user record.
 * Cascading deletes will clean up repositories, collaborators, etc.
 */
async function handleUserDeleted(payload: UserDeletedPayload): Promise<void> {
  const { userId } = payload;

  try {
    // Delete the user by their IDP identity
    const result = await dbPool
      .delete(userTable)
      .where(eq(userTable.identityProviderId, userId))
      .returning({ id: userTable.id });

    if (result.length > 0) {
      console.log(
        `[IDP Webhook] Deleted user ${result[0].id} (IDP user ${userId})`,
      );
    } else {
      console.log(
        `[IDP Webhook] No local user found for IDP user ${userId} (may not exist in Arbor)`,
      );
    }
  } catch (err) {
    console.error(
      `[IDP Webhook] Failed to delete user for IDP user ${userId}:`,
      err,
    );
    throw err;
  }
}

export default idpWebhook;
