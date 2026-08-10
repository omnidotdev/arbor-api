/**
 * Pure readiness evaluation for a cross-repository topic. A topic submits
 * all-or-nothing, so it is ready only when every member pull request can land:
 * each is either already merged, or open and mergeable (its required checks
 * passed). A member that is open-but-blocked, or closed without merging, holds
 * the whole topic back and is reported so the caller can point at it. An empty
 * topic has nothing to submit and is never ready. Kept pure so the readiness
 * rule is testable without a database; the service supplies each member's state.
 */

/** A topic member reduced to what the readiness decision needs. */
export interface TopicMember {
  pullRequestId: string;
  /** The pull request's state: open, merged, or closed. */
  state: string;
  /** Whether an open pull request's required checks have all passed. */
  mergeable: boolean;
}

/** Whether a topic can submit, and the members blocking it if not. */
export interface TopicReadiness {
  ready: boolean;
  blocking: string[];
}

/** A member is satisfied when it has merged, or is open and mergeable. */
const memberSatisfied = (member: TopicMember): boolean =>
  member.state === "merged" || (member.state === "open" && member.mergeable);

export const evaluateTopicReadiness = (
  members: TopicMember[],
): TopicReadiness => {
  const blocking = members
    .filter((member) => !memberSatisfied(member))
    .map((member) => member.pullRequestId);

  return { ready: members.length > 0 && blocking.length === 0, blocking };
};
