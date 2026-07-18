/**
 * Realtime topics for pull request comment changes.
 *
 * The publisher (comment mutations in PullRequestComment.plugin) and the
 * subscriber (pullRequestCommentChanged) both derive the LISTEN/NOTIFY channel
 * name from here so the two cannot drift. Kept in a neutral module to avoid a
 * cyclic import between the authorization plugin and the subscription plugin.
 */

/** Per pull request channel that carries comment change notifications. */
export const pullRequestCommentTopic = (pullRequestId: string): string =>
  `pr_comment:${pullRequestId}`;

/**
 * Dead channel handed to unauthorized or anonymous subscribers. Nothing is ever
 * published to it, so their subscription stays open but silent.
 */
export const NO_ACCESS_TOPIC = "pr_comment:__no_access__";

/** The kind of change delivered on a pullRequestCommentChanged event. */
export type PullRequestCommentAction = "CREATED" | "UPDATED" | "DELETED";
