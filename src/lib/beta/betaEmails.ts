import type { EmailParams } from "@omnidotdev/providers/notifications";
import type { DecisionResult } from "lib/beta/decisionConsumer";

/**
 * Transactional emails for the closed-beta application lifecycle.
 *
 * Pure composers returning `EmailParams` (no I/O), so the copy and the send
 * decision are unit-testable in isolation from the notifications provider. The
 * caller sends the result best-effort via `notifications.sendEmail`, which never
 * throws, so a mail failure never breaks the submit mutation or the decision
 * webhook.
 */

const APP_NAME = "Arbor";

interface Recipient {
  /** The applicant's email address. */
  to: string;
  /** Public base URL of the arbor app, linked as the call to action. */
  appUrl: string;
}

/**
 * Minimal, client-agnostic HTML shell for a transactional email: a heading, a
 * short paragraph, and a single call-to-action link. Inline styles only, so it
 * renders without external CSS across mail clients.
 */
const htmlEmail = ({
  heading,
  paragraph,
  ctaLabel,
  ctaHref,
}: {
  heading: string;
  paragraph: string;
  ctaLabel: string;
  ctaHref: string;
}): string =>
  `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0b140b;line-height:1.55">
  <div style="font-size:20px;font-weight:700;color:#1b7e2a;margin-bottom:20px">🌲 ${APP_NAME}</div>
  <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">${heading}</h1>
  <p style="font-size:15px;margin:0 0 24px">${paragraph}</p>
  <a href="${ctaHref}" style="display:inline-block;background:#1b7e2a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">${ctaLabel}</a>
  <p style="font-size:13px;color:#5a6b5a;margin:28px 0 0">If the button does not work, open <a href="${ctaHref}" style="color:#1b7e2a">${ctaHref}</a></p>
</div>`;

/** Email sent to an applicant when their application is approved. */
export const composeAcceptanceEmail = ({
  to,
  appUrl,
}: Recipient): EmailParams => ({
  to,
  subject: `You're in — welcome to the ${APP_NAME} closed beta`,
  html: true,
  body: htmlEmail({
    heading: "You're approved for the closed beta",
    paragraph: `Your application to the ${APP_NAME} closed beta has been approved. Sign in to start exploring your repositories and the graph.`,
    ctaLabel: `Open ${APP_NAME}`,
    ctaHref: appUrl,
  }),
});

/** Confirmation email sent when an application is first submitted. */
export const composeApplicationReceivedEmail = ({
  to,
  appUrl,
}: Recipient): EmailParams => ({
  to,
  subject: `We received your ${APP_NAME} beta application`,
  html: true,
  body: htmlEmail({
    heading: "Thanks for applying",
    paragraph: `We've received your application to the ${APP_NAME} closed beta and we're reviewing it. We'll email you as soon as there's a decision.`,
    ctaLabel: `Visit ${APP_NAME}`,
    ctaHref: appUrl,
  }),
});

/**
 * Whether an acceptance email should be sent for a just-applied decision.
 *
 * True only on a real transition into "approved" (from pending or declined), so
 * a re-delivered decision event for an already-approved row does not send a
 * duplicate. Declines and ignored decisions never send.
 */
export const shouldSendAcceptanceEmail = (
  priorStatus: string | null | undefined,
  result: DecisionResult,
): boolean =>
  result.outcome === "applied" &&
  result.status === "approved" &&
  priorStatus !== "approved";
